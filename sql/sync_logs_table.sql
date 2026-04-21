-- Tabla para registrar sincronizaciones a Google Drive
-- Ejecutar en Supabase SQL Editor

CREATE TABLE sync_logs (
  id BIGSERIAL PRIMARY KEY,
  venta_id INT NOT NULL,
  compac_id INT,
  drive_file_id TEXT,
  drive_link TEXT,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')),
  error_msg TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX sync_logs_venta_id_idx ON sync_logs(venta_id);
CREATE INDEX sync_logs_status_idx ON sync_logs(status);
CREATE INDEX sync_logs_timestamp_idx ON sync_logs(timestamp);

-- Políticas RLS (si deseas controlar acceso)
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read sync logs"
  ON sync_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to insert/update sync logs"
  ON sync_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role to update sync logs"
  ON sync_logs
  FOR UPDATE
  USING (auth.role() = 'service_role');
