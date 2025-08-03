import type { drive_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

// Google Drive types
export type DriveClient = drive_v3.Drive;
export type DriveFile = drive_v3.Schema$File;
export type AuthClient = OAuth2Client;

export type DriveCredentials = {
  readonly type: string;
  readonly project_id: string;
  readonly private_key_id: string;
  readonly private_key: string;
  readonly client_email: string;
  readonly client_id: string;
  readonly auth_uri: string;
  readonly token_uri: string;
  readonly auth_provider_x509_cert_url: string;
  readonly client_x509_cert_url: string;
};
