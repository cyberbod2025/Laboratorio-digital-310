// Configuración de conexión a Supabase para la app del Laboratorio Digital 310.
//
// La URL corresponde al proyecto Supabase "Laboratorio-digital-310".
// Falta pegar la ANON / PUBLISHABLE KEY: mientras diga "REEMPLAZAR..." la app
// funciona en MODO DEMO (datos de ejemplo en memoria, sin escribir en la nube).
//
// Cómo completarla:
//   1. Reactivar el proyecto Supabase y aplicar las migraciones de supabase/migrations.
//   2. En Supabase: Project Settings → API → copiar la "anon public" (o una
//      publishable key sb_publishable_...).
//   3. Pegarla abajo en SUPABASE_ANON_KEY y volver a desplegar.
//
// La anon key es pública por diseño (va en el navegador); la seguridad real la
// dan las políticas RLS definidas en la migración, no el ocultamiento de la key.
window.LAB_CONFIG = {
  SUPABASE_URL: "https://ucxmqcbjznqqznuzhtsx.supabase.co",
  // Publishable key (pública por diseño; la seguridad la dan las políticas RLS).
  SUPABASE_ANON_KEY: "sb_publishable_faQhpRq8F1VNtZg6Oe1fXQ_360UHNgL",
};
