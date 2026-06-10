-- Snapshot do nome do cliente na venda — evita que atualizar o cadastro do
-- cliente (mesmo CPF) altere o nome exibido em pedidos antigos.
alter table vendas add column if not exists cliente_nome text;

-- Backfill: preenche pedidos existentes com o nome atual do cliente.
update vendas v
set cliente_nome = c.nome
from clientes c
where v.cliente_id = c.id and v.cliente_nome is null;
