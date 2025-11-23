import api from './api';


export async function ingestS3Uris(s3Uris = [], projectId = undefined) {
  if (!Array.isArray(s3Uris) || s3Uris.length === 0) {
    throw new Error('s3Uris must be a non-empty array');
  }

  const payload = { s3_uris: s3Uris };
  if (projectId) payload.project_id = String(projectId);

  const resp = await api.post('ingest/', payload);
  return resp;
}

export default {
  ingestS3Uris,
};
