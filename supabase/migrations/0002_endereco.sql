-- Endereço de entrega (para entregas via motoboy).
-- Idempotente: seguro em bancos que já existem.
alter table entregas add column if not exists endereco text;
