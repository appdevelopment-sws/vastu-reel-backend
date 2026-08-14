export class CreatePermissionDto {
  name: string; // e.g. "reels:create"
  resource: string; // e.g. "reels"
  action: string; // e.g. "create"
}
