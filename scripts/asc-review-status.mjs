#!/usr/bin/env node
// Read-only App Store Connect review status for BCUTZ.
//
// Uses the ASC API key already on disk (~/.appstoreconnect/private_keys/AuthKey_<KID>.p8)
// and the issuer ID + key ID baked in below. GETs only — never writes, submits, or releases.
//
// Prints a compact JSON with the current appStoreVersion, latest uploaded build,
// and the review-submission state. Non-zero exit only on network/auth errors.
//
// Usage:  node scripts/asc-review-status.mjs
//   env:  ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH override the defaults if set.

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const APP_ID        = "6758466535";                              // BCUTZ
const SUBMISSION_ID = "3288d232-6a53-4795-baac-2871eaee4348";    // review submission for 1.0.1(5)

const KEY_ID     = process.env.ASC_KEY_ID     || "A7D857ZRG3";
const ISSUER_ID  = process.env.ASC_ISSUER_ID  || "2d654da5-215a-45c1-8bcc-70069cb69bd0";
const KEY_PATH   = process.env.ASC_KEY_PATH   || join(homedir(), ".appstoreconnect", "private_keys", `AuthKey_${KEY_ID}.p8`);

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

function mintJwt() {
  const pem = readFileSync(KEY_PATH, "utf8");
  const header  = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const payload = { iss: ISSUER_ID, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600, aud: "appstoreconnect-v1" };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const derSig = createSign("SHA256").update(signingInput).sign({ key: pem, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(derSig)}`;
}

async function asc(path) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ASC ${res.status} ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

const jwt = mintJwt();

const [versionsResp, buildsResp, submissionResp] = await Promise.all([
  asc(`/v1/apps/${APP_ID}/appStoreVersions?fields%5BappStoreVersions%5D=versionString,appStoreState,appVersionState,platform,releaseType,createdDate&limit=5`),
  asc(`/v1/apps/${APP_ID}/builds?fields%5Bbuilds%5D=version,uploadedDate,processingState,expired&limit=10`),
  asc(`/v1/reviewSubmissions/${SUBMISSION_ID}?fields%5BreviewSubmissions%5D=state,submittedDate,platform`).catch((e) => ({ error: e.message })),
]);

const versions = (versionsResp.data || []).map((v) => ({
  id: v.id,
  versionString: v.attributes.versionString,
  appStoreState: v.attributes.appStoreState,
  appVersionState: v.attributes.appVersionState,
  releaseType: v.attributes.releaseType,
  createdDate: v.attributes.createdDate,
}));

const builds = (buildsResp.data || []).map((b) => ({
  id: b.id,
  version: b.attributes.version,
  uploadedDate: b.attributes.uploadedDate,
  processingState: b.attributes.processingState,
  expired: b.attributes.expired,
}));

const latestBuild = builds
  .slice()
  .sort((a, b) => Number(b.version) - Number(a.version) || (b.uploadedDate || "").localeCompare(a.uploadedDate || ""))[0] || null;

const submission = submissionResp.error
  ? { id: SUBMISSION_ID, error: submissionResp.error }
  : {
      id: submissionResp.data.id,
      state: submissionResp.data.attributes.state,
      submittedDate: submissionResp.data.attributes.submittedDate,
      platform: submissionResp.data.attributes.platform,
    };

console.log(JSON.stringify({
  fetchedAt: new Date().toISOString(),
  app: { id: APP_ID, bundleId: "com.designhfteam.bcutz" },
  appStoreVersions: versions,
  latestBuild,
  reviewSubmission: submission,
}, null, 2));
