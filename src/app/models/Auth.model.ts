// ─── Universal API response wrapper ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  statusCode: number;
  intOpCode:  string;
  data:       T;
}

// ─── Permisos disponibles (deben coincidir con la BD) ────────────────────────
export type Permission =
  | 'groups_view'   | 'group_view'
  | 'groups_edit'   | 'group_edit'
  | 'groups_delete' | 'group_delete'
  | 'groups_add'    | 'group_add'
  // Users
  | 'users_view'    | 'user_view'
  | 'users_edit'    | 'user_edit'
  | 'user_delete'   | 'user_add'
  // Tickets
  | 'tickets_view'  | 'ticket_view'
  | 'tickets_edit'  | 'ticket_edit'
  | 'ticket_delete' | 'tickets_add'  | 'ticket_add'
  | 'ticket_state';

export const ALL_PERMISSIONS: Permission[] = [
  'tickets_view', 'ticket_view', 'tickets_add', 'ticket_add',
  'tickets_edit', 'ticket_edit', 'ticket_delete', 'ticket_state',
  'users_view', 'user_view', 'user_add', 'user_edit', 'user_delete', 'users_edit',
  'groups_view', 'group_view', 'groups_add', 'group_add',
  'groups_edit', 'group_edit', 'groups_delete', 'group_delete',
];

export const PERM_LABELS: Record<Permission, string> = {
  tickets_view:   'Ver lista de tickets',
  ticket_view:    'Ver detalle de ticket',
  tickets_add:    'Crear tickets',
  ticket_add:     'Agregar ticket',
  tickets_edit:   'Editar lista de tickets',
  ticket_edit:    'Editar ticket',
  ticket_delete:  'Eliminar ticket',
  ticket_state:   'Cambiar estado de ticket',
  users_view:     'Ver lista de usuarios',
  user_view:      'Ver perfil de usuario',
  users_edit:     'Editar usuarios (lista)',
  user_add:       'Crear usuario',
  user_edit:      'Editar usuario',
  user_delete:    'Eliminar usuario',
  groups_view:    'Ver lista de grupos',
  group_view:     'Ver grupo',
  groups_add:     'Crear grupos',
  group_add:      'Agregar miembro al grupo',
  groups_edit:    'Editar grupos (lista)',
  group_edit:     'Editar grupo',
  groups_delete:  'Eliminar grupos (lista)',
  group_delete:   'Eliminar grupo',
};

export const PERM_CATEGORIES: { label: string; icon: string; perms: Permission[] }[] = [
  {
    label: 'Tickets', icon: 'pi-ticket',
    perms: ['tickets_view', 'ticket_view', 'tickets_add', 'ticket_add', 'tickets_edit', 'ticket_edit', 'ticket_delete', 'ticket_state'],
  },
  {
    label: 'Usuarios', icon: 'pi-users',
    perms: ['users_view', 'user_view', 'user_add', 'user_edit', 'user_delete', 'users_edit'],
  },
  {
    label: 'Grupos', icon: 'pi-sitemap',
    perms: ['groups_view', 'group_view', 'groups_add', 'group_add', 'groups_edit', 'group_edit', 'groups_delete', 'group_delete'],
  },
];

// Conjuntos de permisos — usados en Admin para aplicar plantillas rápidas
export const PERMISSION_SETS: Record<string, Permission[]> = {
  superadmin: [
    'groups_view','group_view','groups_edit','group_edit','groups_delete','group_delete','groups_add','group_add',
    'users_view','user_view','users_edit','user_edit','user_delete','user_add',
    'tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add','ticket_state',
  ],
  avanzado: [
    'group_view','group_edit',
    'users_view','user_view',
    'tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add','ticket_state',
  ],
  basico: [
    'ticket_view','ticket_state',
    'user_view',
  ],
};

/** @deprecated Usa PERMISSION_SETS */
export const PERMISSION_PROFILES = PERMISSION_SETS;

// ─── Usuario ──────────────────────────────────────────────────────────────────
export interface AppUser {
  id:          string;   // UUID
  fullName:    string;   // nombre_completo
  username:    string;
  email:       string;
  phone?:      string;   // telefono
  birthDate?:  string;   // fecha_nacimiento
  address?:    string;   // direccion
  lastLogin?:  string;   // last_login
  createdAt?:  string;   // creado_en
  // Presentes en respuestas del endpoint admin (/users, /users/:id)
  permissions?: Permission[];
  groupIds?:    string[];
}

// ─── Grupo ────────────────────────────────────────────────────────────────────
export interface AppGroup {
  id:          string;   // UUID
  nombre:      string;
  nivel?:      string;
  descripcion?: string;
  color:       string;
  model?:      string;
  creatorId?:  string;   // creator_id
  createdAt?:  string;   // creado_en
  // Opcionales en respuestas enriquecidas
  memberCount?:       number;
  ticketCount?:       number;
  defaultPermissions?: Permission[];
}

// Miembro de grupo con contexto de permisos
export interface GroupMember {
  id:                   string;
  fullName:             string;
  username:             string;
  email:                string;
  permissions?:         Permission[];   // permisos globales
  effectivePermissions: Permission[];   // permisos efectivos en el grupo
  hasOverride:          boolean;
}

// ─── Tickets ──────────────────────────────────────────────────────────────────
export type TicketStatus   = 'pendiente' | 'en_progreso' | 'hecho' | 'bloqueado';
export type TicketPriority = 'baja' | 'media' | 'alta' | 'critica';

export interface Ticket {
  id:           string;   // UUID
  titulo:       string;
  descripcion:  string;
  status:       TicketStatus;    // nombre del estado (resuelto en la API)
  priority:     TicketPriority;  // nombre de la prioridad (resuelto en la API)
  groupId:      string;   // grupo_id
  assignedToId: string;   // asignado_id ('' si no asignado)
  createdById:  string;   // autor_id
  createdAt:    string;
  dueDate?:     string;   // fecha_final
}

// ─── Ticket Detail: prioridades extendidas (UI) ───────────────────────────────
export type TicketPriorityExtended =
  | 'minima' | 'baja' | 'normal' | 'alta' | 'urgente' | 'critica' | 'bloqueante';

export const PRIORITY_EXTENDED_META: Record<TicketPriorityExtended, {
  label: string; icon: string; color: string; bg: string; rank: number;
}> = {
  minima:     { label:'Mínima',     icon:'pi-angle-double-down', color:'#64748b', bg:'rgba(100,116,139,.14)', rank:1 },
  baja:       { label:'Baja',       icon:'pi-angle-down',        color:'#4ade80', bg:'rgba(74,222,128,.14)',  rank:2 },
  normal:     { label:'Normal',     icon:'pi-minus',             color:'#38bdf8', bg:'rgba(56,189,248,.14)',  rank:3 },
  alta:       { label:'Alta',       icon:'pi-angle-up',          color:'#f59e0b', bg:'rgba(245,158,11,.14)',  rank:4 },
  urgente:    { label:'Urgente',    icon:'pi-angle-double-up',   color:'#fb923c', bg:'rgba(251,146,60,.14)',  rank:5 },
  critica:    { label:'Crítica',    icon:'pi-exclamation-circle',color:'#f87171', bg:'rgba(248,113,113,.14)', rank:6 },
  bloqueante: { label:'Bloqueante', icon:'pi-ban',               color:'#e11d48', bg:'rgba(225,29,72,.16)',   rank:7 },
};

// ─── Comentario ───────────────────────────────────────────────────────────────
export interface TicketComment {
  id:        string;
  ticketId:  string;
  userId:    string;
  text:      string;      // contenido
  createdAt: string;
  userName?: string;      // join opcional
}

// ─── Historial ────────────────────────────────────────────────────────────────
export type HistoryAction =
  | 'created' | 'status_changed' | 'priority_changed'
  | 'assigned' | 'title_changed' | 'description_changed'
  | 'duedate_changed' | 'comment_added';

export interface TicketHistory {
  id:        string;
  ticketId:  string;
  userId:    string;
  action:    HistoryAction;
  from?:     string;
  to?:       string;
  note?:     string;
  createdAt: string;
  userName?: string;
}

// ─── Payload JWT (decodificado en cliente) ────────────────────────────────────
export interface JwtPayload {
  sub:              string;    // UUID del usuario
  username:         string;
  email:            string;
  fullName?:        string;
  nombre_completo?: string;   // campo real en el JWT firmado por el backend
  groupIds:         string[];
  permisos:         string[];  // campo real en el JWT firmado por el backend
  permissions:      string[];  // alias (puede no estar presente)
  iat:              number;
  exp:              number;    // segundos epoch (estándar JWT)
}

// ─── Respuesta de login ───────────────────────────────────────────────────────
export interface LoginResponse {
  token:       string;
  user:        AppUser;
  permissions: Permission[];
  groups:      AppGroup[];
}
