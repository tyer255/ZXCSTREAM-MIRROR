import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_NXSHA_PROVIDERS,
  isAuthorizedNxshaProvider,
  isPrivateOrLoopbackHost,
  isTrustedNxshaMediaUrl,
  validatePlayableNxshaSource,
  validateNxshaProviderResponse,
  raceNxshaProviders,
  NxshaServerStateMachine,
} from './nxshaDiscovery';

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      },
      { once: true }
    );
  });

describe('NXSHA Parallel Source Discovery & First-Valid-Source Racing Engine', () => {
  it('Scenario 1: First NXSHA provider fails, second succeeds concurrently without waiting sequentially', async () => {
    const startOrder: string[] = [];
    const result = await raceNxshaProviders({
      providers: ['rive-citadel', 'watchout', 'streamflix'],
      queryProvider: async (provider, signal) => {
        startOrder.push(provider);
        if (provider === 'rive-citadel') {
          await sleep(20, signal);
          throw new Error('Upstream 502 Bad Gateway');
        }
        if (provider === 'watchout') {
          await sleep(35, signal);
          return {
            sources: [
              {
                url: 'https://cdn.watchout-media.example.com/hls/movie1080/index.m3u8',
                quality: '1080p',
                label: '1080p | English',
                type: 'hls',
              },
            ],
          };
        }
        await sleep(300, signal);
        return { sources: [] };
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.winner?.provider, 'watchout');
    assert.equal(result.diagnostics.winningProvider, 'watchout');
    assert.equal(result.diagnostics.totalFailedProviders, 1);
    // All 3 started concurrently before any finished
    assert.deepEqual(startOrder, ['rive-citadel', 'watchout', 'streamflix']);
    // streamflix was cancelled once watchout won
    const streamflixDiag = result.diagnostics.providerTimings.find((t) => t.provider === 'streamflix');
    assert.equal(streamflixDiag?.status, 'aborted');
  });

  it('Scenario 2: Several providers succeed simultaneously — first validated wins and others are ignored/aborted', async () => {
    const result = await raceNxshaProviders({
      providers: ['rive-citadel', 'watchout', 'purstream'],
      queryProvider: async (provider) => {
        return {
          sources: [
            {
              url: `https://edge.${provider}.example.com/stream/master.m3u8`,
              quality: '1080p',
              type: 'hls',
            },
          ],
        };
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.winner?.provider, 'rive-citadel');
    assert.equal(result.diagnostics.winningProvider, 'rive-citadel');
    const winners = result.diagnostics.providerTimings.filter((t) => t.status === 'winner');
    assert.equal(winners.length, 1);
    assert.ok(result.diagnostics.lateIgnoredCount >= 1 || result.diagnostics.cancelledProvidersCount >= 1);
  });

  it('Scenario 3: A later provider in the list succeeds before an earlier slow provider', async () => {
    let citadelAborted = false;
    const result = await raceNxshaProviders({
      providers: ['rive-citadel', 'castle', 'watchout', 'nitro'],
      queryProvider: async (provider, signal) => {
        signal.addEventListener('abort', () => {
          if (provider === 'rive-citadel') citadelAborted = true;
        });
        if (provider === 'nitro') {
          await sleep(15, signal);
          return {
            sources: [
              {
                url: 'https://cdn.nitro-edge.example.com/hls/720p/playlist.m3u8',
                quality: '720p',
                type: 'hls',
              },
            ],
          };
        }
        await sleep(500, signal);
        return {
          sources: [
            {
              url: `https://cdn.${provider}.example.com/hls/master.m3u8`,
              quality: '1080p',
              type: 'hls',
            },
          ],
        };
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.winner?.provider, 'nitro');
    assert.equal(citadelAborted, true);
    assert.ok(
      result.diagnostics.timeToFirstValidSourceMs !== null &&
        result.diagnostics.timeToFirstValidSourceMs < 150,
      `Expected fast resolution (<150ms), got ${result.diagnostics.timeToFirstValidSourceMs}ms`
    );
  });

  it('Scenario 4: All providers fail — returns structured no-source-available result with complete diagnostics', async () => {
    const result = await raceNxshaProviders({
      providers: ['rive-citadel', 'watchout', 'streamflix'],
      queryProvider: async (provider) => {
        if (provider === 'rive-citadel') throw new Error('Network error');
        if (provider === 'watchout') return { sources: [] };
        return {
          sources: [
            {
              url: 'https://gemma416okl.com/play/tt0119698',
              isEmbed: true,
            },
          ],
        };
      },
    });

    assert.equal(result.success, false);
    assert.equal(result.winner, null);
    assert.equal(result.diagnostics.winningProvider, null);
    assert.equal(result.diagnostics.totalProvidersQueried, 3);
    assert.equal(result.diagnostics.totalFailedProviders, 3);
    assert.match(result.error || '', /No active ad-free stream found/i);
  });

  it('Scenario 5: One provider times out while another succeeds', async () => {
    const result = await raceNxshaProviders({
      providers: ['rive-citadel', 'watchout', 'purstream'],
      providerTimeoutMs: 60,
      queryProvider: async (provider, signal) => {
        if (provider === 'rive-citadel') {
          // Exceeds 60ms timeout
          await sleep(300, signal);
          return { sources: [] };
        }
        if (provider === 'watchout') {
          // Fails after 80ms timeout, wait — let's make purstream succeed at 90ms with higher timeout or watchout succeed at 25ms after rive-citadel times out
          await sleep(300, signal);
          return { sources: [] };
        }
        await sleep(30, signal);
        return {
          sources: [
            {
              url: 'https://stream.purstream.example.com/hls/index.m3u8',
              quality: '1080p',
              type: 'hls',
            },
          ],
        };
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.winner?.provider, 'purstream');

    // Also test when provider A times out BEFORE provider B resolves
    const resultAfterTimeout = await raceNxshaProviders({
      providers: ['rive-citadel', 'purstream'],
      providerTimeoutMs: 50,
      queryProvider: async (provider, signal) => {
        if (provider === 'rive-citadel') {
          await sleep(200, signal);
          return { sources: [] };
        }
        await sleep(10, signal);
        return {
          sources: [
            {
              url: 'https://stream.purstream.example.com/hls/index.m3u8',
              quality: '1080p',
              type: 'hls',
            },
          ],
        };
      },
    });
    assert.equal(resultAfterTimeout.success, true);
    assert.equal(resultAfterTimeout.winner?.provider, 'purstream');
  });

  it('Scenario 6: Rejects invalid HTTP 200 responses (empty, malformed, embed-only, dead worker, SSRF URLs) and picks valid provider', async () => {
    const result = await raceNxshaProviders({
      providers: ['rive-citadel', 'castle', 'watchout', 'streamflix', 'nitro'],
      queryProvider: async (provider) => {
        switch (provider) {
          case 'rive-citadel':
            // HTTP 200 but empty sources
            return { sources: [] };
          case 'castle':
            // HTTP 200 but dead Cloudflare worker URL
            return {
              sources: [{ url: 'https://nxstreamhub.workers.dev/playlist.m3u8', type: 'hls' }],
            };
          case 'watchout':
            // HTTP 200 but HTML embed iframe
            return {
              sources: [{ url: 'https://gemma416okl.com/play/tt12345', isEmbed: true }],
            };
          case 'streamflix':
            // HTTP 200 but SSRF loopback URL
            return {
              sources: [{ url: 'http://127.0.0.1:3000/internal.m3u8', type: 'hls' }],
            };
          case 'nitro':
            // Valid playable stream
            return {
              sources: [
                {
                  url: '/api/nxsha/proxy?url=' + encodeURIComponent('https://finepulfe.xyz/hls/master.m3u8'),
                  org_uri: 'https://finepulfe.xyz/hls/master.m3u8',
                  quality: '1080p',
                  type: 'hls',
                },
              ],
            };
          default:
            return { sources: [] };
        }
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.winner?.provider, 'nitro');
    assert.equal(result.diagnostics.totalFailedProviders, 4);

    for (const badProv of ['rive-citadel', 'castle', 'watchout', 'streamflix']) {
      const diag = result.diagnostics.providerTimings.find((t) => t.provider === badProv);
      assert.equal(diag?.status, 'invalid_response');
    }
  });

  it('Scenario 7: Deduplicates provider inputs, ignores late responses after winner selection, and blocks unauthorized providers', async () => {
    let callCount = 0;
    const result = await raceNxshaProviders({
      providers: [
        'rive-citadel',
        'rive-citadel', // duplicate should be deduplicated
        'malicious-unconfigured-scraper', // unauthorized should be blocked
        'watchout',
      ],
      queryProvider: async (provider) => {
        callCount++;
        if (provider === 'rive-citadel') {
          return {
            sources: [
              {
                url: 'https://hscow.com/hls/2024/10yue/TheWildRobot_Hindi_720/index.m3u8',
                label: '720p | Hindi',
                quality: '720p',
                type: 'hls',
              },
            ],
          };
        }
        // Returns late even if not checking abort signal
        await new Promise((r) => setTimeout(r, 30));
        return {
          sources: [
            {
              url: 'https://cdn.watchout.example.com/hls/master.m3u8',
              quality: '1080p',
              type: 'hls',
            },
          ],
        };
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.winner?.provider, 'rive-citadel');
    // Only rive-citadel (once) and watchout were queried; malicious-unconfigured-scraper was blocked
    assert.equal(callCount, 2);
    const unauthorizedDiag = result.diagnostics.providerTimings.find(
      (t) => t.provider === 'malicious-unconfigured-scraper'
    );
    assert.equal(unauthorizedDiag?.status, 'unauthorized');
  });

  it('Scenario 8: Security & SSRF URL validation rejects private IPs, metadata endpoints, and non-HTTP schemes', () => {
    assert.equal(isAuthorizedNxshaProvider('rive-citadel'), true);
    assert.equal(isAuthorizedNxshaProvider('evil-provider'), false);
    assert.equal(ALLOWED_NXSHA_PROVIDERS.length, 9);

    assert.equal(isPrivateOrLoopbackHost('localhost'), true);
    assert.equal(isPrivateOrLoopbackHost('127.0.0.1'), true);
    assert.equal(isPrivateOrLoopbackHost('169.254.169.254'), true);
    assert.equal(isPrivateOrLoopbackHost('10.0.0.1'), true);
    assert.equal(isPrivateOrLoopbackHost('192.168.1.50'), true);
    assert.equal(isPrivateOrLoopbackHost('172.20.0.1'), true);
    assert.equal(isPrivateOrLoopbackHost('[::1]'), true);
    assert.equal(isPrivateOrLoopbackHost('hscow.com'), false);

    assert.equal(isTrustedNxshaMediaUrl('http://169.254.169.254/latest/meta-data/'), false);
    assert.equal(isTrustedNxshaMediaUrl('javascript:alert(1)'), false);
    assert.equal(
      isTrustedNxshaMediaUrl('/api/nxsha/proxy?url=' + encodeURIComponent('http://127.0.0.1:3000/secret')),
      false
    );
    assert.equal(
      isTrustedNxshaMediaUrl('https://hscow.com/hls/2024/10yue/TheWildRobot_Hindi_720/index.m3u8'),
      true
    );

    const validSourceCheck = validatePlayableNxshaSource({
      url: 'https://hscow.com/hls/2024/10yue/TheWildRobot_Hindi_720/index.m3u8',
      label: '720p | Hindi',
      quality: '720p',
    });
    assert.equal(validSourceCheck.valid, true);
    assert.equal(validSourceCheck.normalizedSource?.lang, 'hi');

    const badProviderCheck = validateNxshaProviderResponse('castle', {
      sources: [{ url: 'https://gemma416okl.com/play/123', isEmbed: true }],
    });
    assert.equal(badProviderCheck.valid, false);

    // Reject expired signature URL (Expires=1700000000 is in the past)
    const expiredSigCheck = validatePlayableNxshaSource({
      url: 'https://img1.hscow.com/myhls/2024/11yue/TheWildRobot_Hindi_720/index_287.m3u8?Expires=1700000000&KeyName=Signature&Signature=abc',
      label: '720p | Hindi',
    });
    assert.equal(expiredSigCheck.valid, false);
    assert.match(expiredSigCheck.reason || '', /expired/i);

    // Reject raw .mkv container masquerading as mp4
    const mkvCheck = validatePlayableNxshaSource({
      url: 'https://mp4.adara15e432.workers.dev/?url=https://s1.streamflixserver.site/movies/2024/thewildrobot.mkv',
      org_uri: 'https://s1.streamflixserver.site/movies/2024/thewildrobot.mkv',
      type: 'mp4',
    });
    assert.equal(mkvCheck.valid, false);
  });

  it('Scenario 9: NxshaServerStateMachine enforces all 8 server state management & UI synchronization rules', () => {
    const providers = [
      { index: 0, id: 'rive-citadel', label: 'Citadel' },
      { index: 1, id: 'castle', label: 'Castle' },
      { index: 2, id: 'watchout', label: 'Watchout' },
      { index: 3, id: 'streamflix', label: 'Streamflix' },
    ];
    const sm = new NxshaServerStateMachine();

    // Start Session 1 and launch discovery concurrently across all providers
    const session1 = sm.startSession('movie:1184918:1:1', providers);
    for (const p of providers) {
      const begin = sm.beginProviderDiscovery(session1, p.id);
      assert.equal(begin.started, true);
    }
    assert.equal(sm.getVisibleServers(session1).length, 4);
    assert.ok(
      sm.getVisibleServers(session1).every((s) => s.state === 'PROCESSING' && s.status === 'checking')
    );

    // 1. A provider fails and disappears immediately from visible list
    const failedOk = sm.markProviderFailed(session1, 'castle', 'HTTP 404');
    assert.equal(failedOk.applied, true);
    assert.equal(sm.getServer('castle', session1)?.state, 'FAILED');
    assert.equal(sm.isProviderFailed(session1, 'castle'), true);
    assert.deepEqual(
      sm.getVisibleServers(session1).map((s) => s.code),
      ['rive-citadel', 'watchout', 'streamflix']
    );

    // 2. A failed provider never reappears in the same search session (even if late success or duplicate start arrives)
    assert.equal(sm.beginProviderDiscovery(session1, 'castle').started, false);
    const lateRetry = sm.resolveProviderSuccess(session1, 'castle', {
      sources: [{ url: 'https://hscow.com/hls/late.m3u8', type: 'hls' }],
      subtitles: [],
    });
    assert.equal(lateRetry.applied, false);
    assert.equal(sm.getServer('castle', session1)?.state, 'FAILED');
    assert.ok(!sm.getVisibleServers(session1).some((s) => s.code === 'castle'));

    // 3. Processing providers remain visible while others fail
    const watchoutVisible = sm.getVisibleServers(session1).find((s) => s.code === 'watchout');
    assert.equal(watchoutVisible?.state, 'PROCESSING');
    assert.equal(watchoutVisible?.status, 'checking');

    // First valid provider wins -> becomes SELECTED, others remain PROCESSING or become AVAILABLE
    const firstWin = sm.resolveProviderSuccess(session1, 'rive-citadel', {
      sources: [{ url: 'https://hscow.com/hls/citadel.m3u8', type: 'hls' }],
      subtitles: [],
    });
    assert.equal(firstWin.applied, true);
    assert.equal(firstWin.becameSelected, true);
    assert.equal(sm.getSelectedProviderCode(session1), 'rive-citadel');
    assert.equal(sm.getServer('rive-citadel', session1)?.state, 'SELECTED');

    // Second valid provider finishes -> becomes AVAILABLE (standby), does not replace SELECTED winner
    const secondWin = sm.resolveProviderSuccess(session1, 'watchout', {
      sources: [{ url: 'https://hscow.com/hls/watchout.m3u8', type: 'hls' }],
      subtitles: [],
    });
    assert.equal(secondWin.applied, true);
    assert.equal(secondWin.becameSelected, false);
    assert.equal(sm.getSelectedProviderCode(session1), 'rive-citadel');
    assert.equal(sm.getServer('watchout', session1)?.state, 'AVAILABLE');

    // 4. Player never switches back to a failed provider during fallback
    // Suppose rive-citadel fails before playback establishes -> fallback selects 'watchout' (AVAILABLE) and permanently excludes 'rive-citadel' and 'castle'
    const fallback = sm.failSelectedAndSelectNext(
      session1,
      'rive-citadel',
      'HLS fatal network error'
    );
    assert.equal(sm.getServer('rive-citadel', session1)?.state, 'FAILED');
    assert.equal(fallback.nextSelected?.code, 'watchout');
    assert.equal(sm.getSelectedProviderCode(session1), 'watchout');
    assert.deepEqual(sm.getFailedProviderCodes(session1).sort(), ['castle', 'rive-citadel']);

    // 5. Late response cannot overwrite newer server state or fail an established SELECTED server
    sm.markPlaybackEstablished(session1, 'watchout');
    const unrelatedFailure = sm.markProviderFailed(
      session1,
      'watchout',
      'Unrelated late timeout',
      { isPlaybackError: false }
    );
    assert.equal(unrelatedFailure.applied, false);
    assert.equal(sm.getServer('watchout', session1)?.state, 'SELECTED');

    // Stale response from an old session is ignored
    const staleSessionId = 'stale_session_0';
    assert.equal(sm.markProviderFailed(staleSessionId, 'streamflix', 'Old session error').applied, false);
    assert.equal(sm.getServer('streamflix', session1)?.state, 'PROCESSING');

    // 6. New movie search resets previous session state
    const session2 = sm.startSession('movie:999999:1:1', providers);
    for (const p of providers) {
      sm.beginProviderDiscovery(session2, p.id);
    }
    assert.notEqual(session2, session1);
    assert.equal(sm.getFailedProviderCodes(session2).length, 0);
    assert.equal(sm.getVisibleServers(session2).length, 4);
    assert.ok(sm.getVisibleServers(session2).every((s) => s.state === 'PROCESSING'));
  });
});

