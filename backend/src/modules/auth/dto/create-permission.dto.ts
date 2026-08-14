export class CreatePermissionDto {
  name: string; // e.g. "buses:manage"
  resource: string; // e.g. "buses"
  action: string; // e.g. "manage"
}
