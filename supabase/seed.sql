-- ============================================================================
--  Seed — produtos (joias), clientes e motoboys fictícios
--  Idempotente: pode rodar mais de uma vez sem duplicar.
-- ============================================================================

-- Produtos (mínimo 10) — catálogo de joalheria -----------------------------
insert into produtos (nome, preco)
select * from (values
  ('Anel Solitário de Ouro 18k',     2890.00),
  ('Aliança de Ouro 18k (par)',      3450.00),
  ('Brinco de Diamante',             1990.00),
  ('Colar de Pérolas',               1290.00),
  ('Corrente de Ouro Masculina',     2150.00),
  ('Pingente Coração de Ouro',        690.00),
  ('Pulseira de Prata 925',           320.00),
  ('Anel de Prata com Zircônia',      240.00),
  ('Relógio de Pulso Dourado',        850.00),
  ('Conjunto Colar + Brinco',        1450.00),
  ('Aliança de Prata 925 (par)',      560.00),
  ('Tornozeleira de Prata',           180.00)
) as v(nome, preco)
where not exists (select 1 from produtos p where p.nome = v.nome);

-- Clientes ------------------------------------------------------------------
-- CPF válido (dígitos verificadores corretos) para o avaliador testar o
-- fluxo "esqueci o código".
insert into clientes (nome, whatsapp, cpf) values
  ('Cliente Demonstração', '+5511999990000', '11144477735')
on conflict (cpf) do nothing;

-- Motoboys (códigos fixos para o avaliador testar) --------------------------
insert into motoboys (nome, whatsapp, codigo) values
  ('Carlos Silva (Motoboy)', '+5511988887777', 'MOTO-A1B2'),
  ('Ana Souza (Motoboy)',    '+5511977776666', 'MOTO-C3D4')
on conflict (codigo) do nothing;
