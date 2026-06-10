-- ============================================================================
--  Seed — produtos, clientes e motoboys fictícios
--  Idempotente: pode rodar mais de uma vez sem duplicar.
-- ============================================================================

-- Produtos (mínimo 10) ------------------------------------------------------
insert into produtos (nome, preco)
select * from (values
  ('Arroz Branco 5kg',          27.90),
  ('Feijão Carioca 1kg',         8.49),
  ('Óleo de Soja 900ml',         7.29),
  ('Açúcar Refinado 1kg',        4.99),
  ('Café Torrado 500g',         18.90),
  ('Leite Integral 1L',          5.49),
  ('Macarrão Espaguete 500g',    4.29),
  ('Molho de Tomate 340g',       3.79),
  ('Sabão em Pó 1kg',           14.90),
  ('Detergente Neutro 500ml',    2.49),
  ('Papel Higiênico 12un',      22.90),
  ('Refrigerante 2L',            8.99)
) as v(nome, preco)
where not exists (select 1 from produtos p where p.nome = v.nome);

-- Clientes ------------------------------------------------------------------
insert into clientes (nome, whatsapp, cpf) values
  ('Cliente Demonstração', '+5511999990000', '12345678901')
on conflict (cpf) do nothing;

-- Motoboys (códigos fixos para o avaliador testar) --------------------------
insert into motoboys (nome, whatsapp, codigo) values
  ('Carlos Silva (Motoboy)', '+5511988887777', 'MOTO-A1B2'),
  ('Ana Souza (Motoboy)',    '+5511977776666', 'MOTO-C3D4')
on conflict (codigo) do nothing;
