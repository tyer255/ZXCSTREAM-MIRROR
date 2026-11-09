import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DEMO_API_KEY,
  PublicDownloadApiManager,
  extractApiKeyFromRequest,
  generateDeveloperApiKeyPair,
  hashApiKey,
  signDownloadFileToken,
  validateDownloadRequestInput,
  verifyDownloadFileToken,
} from './publicDownloadApi.js';
import { resolveDownloadableMedia } from './downloadEngineResolver.js';

describe('Public Download API Engine & Developer Key Management', () => {
  it('generates cryptographically strong API keys with SHA-256 hashing and masked prefixes', () => {
    const pair1 = generateDeveloperApiKeyPair();
    const pair2 = generateDeveloperApiKeyPair();

    assert.ok(pair1.rawKey.startsWith('zxc_live_'));
    assert.notEqual(pair1.rawKey, pair2.rawKey);
    assert.equal(pair1.keyHash.length, 64);
    assert.equal(pair1.keyHash, hashApiKey(pair1.rawKey));
    assert.ok(pair1.keyPrefix.includes('...'));
    // Prefix must not expose the middle secret bytes
    assert.ok(pair1.keyPrefix.length < pair1.rawKey.length);
  });

  it('extracts API keys from Authorization Bearer, X-API-Key header, and query params', () => {
    assert.equal(
      extractApiKeyFromRequest({ authorization: 'Bearer zxc_live_test123' }),
      'zxc_live_test123'
    );
    assert.equal(
      extractApiKeyFromRequest({ 'x-api-key': 'zxc_live_header456' }),
      'zxc_live_header456'
    );
    assert.equal(
      extractApiKeyFromRequest({}, { api_key: 'zxc_live_query789' }),
      'zxc_live_query789'
    );
    assert.equal(extractApiKeyFromRequest({}), null);
  });

  it('manages API key lifecycle (create, authenticate, list without raw secret, revoke)', () => {
    const manager = new PublicDownloadApiManager({ persistEnabled: false });

    // Default key should be active out of the box
    const defaultAuth = manager.authenticateKey(DEFAULT_DEMO_API_KEY);
    assert.equal(defaultAuth.authenticated, true);
    assert.equal(defaultAuth.key?.rateLimit, 'UNLIMITED');
    assert.equal(defaultAuth.key?.quota, 'UNLIMITED');

    // Create a new key
    const created = manager.createApiKey('External Production App');
    assert.ok(created.rawKey.startsWith('zxc_live_'));
    assert.equal(created.key.name, 'External Production App');
    assert.equal(created.key.status, 'active');

    // Authenticate with new key
    const authRes = manager.authenticateKey(created.rawKey);
    assert.equal(authRes.authenticated, true);
    assert.equal(authRes.key?.id, created.key.id);

    // Revoke key
    const revoked = manager.revokeApiKey(created.key.id);
    assert.equal(revoked?.status, 'revoked');
    assert.ok(revoked?.revokedAt);

    // Subsequent authentication with revoked key must fail
    const postRevokeAuth = manager.authenticateKey(created.rawKey);
    assert.equal(postRevokeAuth.authenticated, false);
    assert.equal(postRevokeAuth.code, 'REVOKED_API_KEY');
  });

  it('enforces UNLIMITED API requests and UNLIMITED downloads with zero rate limiting', () => {
    const manager = new PublicDownloadApiManager({ persistEnabled: false });
    const { rawKey } = manager.createApiKey('High Volume Server');

    // Simulate 500 rapid consecutive API requests and download jobs
    for (let i = 0; i < 500; i++) {
      const auth = manager.authenticateKey(rawKey);
      assert.equal(auth.authenticated, true, `Request #${i + 1} must not be rate-limited`);
      assert.equal(auth.key?.rateLimit, 'UNLIMITED');
      assert.equal(auth.key?.quota, 'UNLIMITED');
    }

    const usage = manager.getUsageStatistics();
    assert.equal(usage.unlimitedRequests, true);
    assert.equal(usage.unlimitedDownloads, true);
    assert.equal(usage.rateLimit, null);
    assert.equal(usage.quota, null);
    assert.ok(usage.metrics.totalRequests >= 500);
  });

  it('validates download request parameters and returns structured error codes', () => {
    const validMovie = validateDownloadRequestInput({
      mediaType: 'movie',
      tmdbId: '128',
      lang: 'hi',
      quality: '1080p',
    });
    assert.equal(validMovie.valid, true);
    if (validMovie.valid) {
      assert.equal(validMovie.data.mediaType, 'movie');
      assert.equal(validMovie.data.tmdbId, '128');
      assert.equal(validMovie.data.lang, 'hi');
      assert.equal(validMovie.data.quality, '1080p');
    }

    const validTv = validateDownloadRequestInput({
      mediaType: 'tv',
      tmdbId: '66732',
      season: 2,
      episode: 5,
      lang: 'en',
      quality: '4K',
    });
    assert.equal(validTv.valid, true);
    if (validTv.valid) {
      assert.equal(validTv.data.quality, '2160p');
      assert.equal(validTv.data.season, 2);
      assert.equal(validTv.data.episode, 5);
    }

    const invalidType = validateDownloadRequestInput({
      mediaType: 'podcast',
      tmdbId: '128',
    });
    assert.equal(invalidType.valid, false);
    if (!invalidType.valid) {
      assert.equal(invalidType.code, 'INVALID_MEDIA_TYPE');
    }

    const missingId = validateDownloadRequestInput({
      mediaType: 'movie',
      tmdbId: '',
    });
    assert.equal(missingId.valid, false);
    if (!missingId.valid) {
      assert.equal(missingId.code, 'INVALID_TMDB_ID');
    }

    const invalidQuality = validateDownloadRequestInput({
      mediaType: 'movie',
      tmdbId: '128',
      quality: '9999p',
    });
    assert.equal(invalidQuality.valid, false);
    if (!invalidQuality.valid) {
      assert.equal(invalidQuality.code, 'INVALID_QUALITY');
    }
  });

  it('integrates directly with existing resolveDownloadableMedia engine and signs expiring URLs', async () => {
    const manager = new PublicDownloadApiManager({ persistEnabled: false });
    const auth = manager.authenticateKey(DEFAULT_DEMO_API_KEY);
    assert.ok(auth.authenticated && auth.key);

    const validated = validateDownloadRequestInput({
      mediaType: 'movie',
      tmdbId: '128',
      lang: 'en',
      quality: '1080p',
    });
    assert.ok(validated.valid);

    const job = manager.createDownloadJob({
      key: auth.key,
      request: validated.data,
    });
    assert.ok(job.id.startsWith('job_'));
    assert.equal(job.status, 'processing');

    // Pass to existing Download Engine
    const engineResolution = await resolveDownloadableMedia(
      {
        mediaType: validated.data.mediaType,
        tmdbId: validated.data.tmdbId,
        season: validated.data.season,
        episode: validated.data.episode,
      },
      async () => ({
        title: 'Princess Mononoke',
        release_date: '1997-07-12',
        runtime: 134,
      })
    );

    const completedJob = manager.completeDownloadJobWithResolution(job.id, engineResolution);
    assert.ok(completedJob);
    assert.equal(completedJob.status, 'completed');
    assert.equal(completedJob.progress, 100);
    assert.equal(completedJob.title, 'Princess Mononoke');
    assert.ok(completedJob.internalDownloadUrl?.startsWith('/api/download/file?'));

    const publicResp = manager.formatPublicJobResponse(completedJob, 'http://localhost:3000');
    assert.equal(publicResp.success, true);
    assert.equal(publicResp.status, 'completed');
    assert.equal(publicResp.baseApiUrl, 'https://zxcstream-mirror.vercel.app/api/v1');
    assert.ok(
      publicResp.downloadUrl.startsWith('https://zxcstream-mirror.vercel.app/api/v1/downloads/'),
      `Expected deployed URL, got: ${publicResp.downloadUrl}`
    );
    assert.ok(publicResp.downloadUrl.includes('token='));
    assert.ok(publicResp.downloadUrl.includes('expires='));

    const runAppResp = manager.formatPublicJobResponse(
      completedJob,
      'https://ais-dev-mzsryxce2akujdk22pk536-746177146215.asia-southeast1.run.app'
    );
    assert.ok(
      runAppResp.downloadUrl.startsWith('https://zxcstream-mirror.vercel.app/api/v1/downloads/'),
      `Expected deployed URL instead of run.app dev URL, got: ${runAppResp.downloadUrl}`
    );

    // Verify signed token is valid before expiry and rejected after expiry
    const tokenCheck = verifyDownloadFileToken({
      jobId: completedJob.id,
      keyId: completedJob.keyId,
      token: completedJob.signedToken,
      expiresAtMs: completedJob.expiresAtMs,
    });
    assert.equal(tokenCheck.valid, true);

    const expiredCheck = verifyDownloadFileToken({
      jobId: completedJob.id,
      keyId: completedJob.keyId,
      token: completedJob.signedToken,
      expiresAtMs: completedJob.expiresAtMs,
      nowMs: completedJob.expiresAtMs + 1000,
    });
    assert.equal(expiredCheck.valid, false);
    assert.equal(expiredCheck.reason, 'Download URL has expired');

    const tamperedCheck = verifyDownloadFileToken({
      jobId: completedJob.id,
      keyId: completedJob.keyId,
      token: signDownloadFileToken('other_job', completedJob.keyId, completedJob.expiresAtMs),
      expiresAtMs: completedJob.expiresAtMs,
    });
    assert.equal(tamperedCheck.valid, false);
  });
});
