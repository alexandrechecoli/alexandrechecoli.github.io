
-- Encontrar o endereço 900 Somerville Avenue
--SELECT * FROM "addresses" WHERE "address" = '900 Somerville Avenue';
-- 432

-- Encontrar as entregas com inicio em 900 Somerville Avenue (id 432)
-- SELECT * FROM "packages" WHERE ("from_address_id" = 432) AND ("contents" = 'Congratulatory letter');
-- 384

-- Encontrar o scan com a entrega 
-- SELECT * FROM "scans" WHERE "package_id" = 384;
-- id 54 e 94 ->

-- Completa
SELECT * FROM "scans" WHERE "package_id" = (
  SELECT "id" FROM "packages" WHERE  ("contents" = 'Congratulatory letter') AND ("from_address_id" = (
    SELECT "id" FROM "addresses" WHERE "address" = '900 Somerville Avenue'))
    );


---------------------------------------------------------

-- Selecionando um pacote sem remetente (5098)
-- SELECT * FROM "packages" WHERE "from_address_id" IS NULL;

-- Verificando os scans que tem o pacote 5098
-- SELECT * FROM "scans" WHERE "package_id" = 5098;

-- Verificando o último endereço de entrega (348) e o último motorista (10)
-- SELECT * FROM "addresses" WHERE "id" = 348; --POLICIA!

-- SELECT * FROM "drivers" WHERE "id" = 10;

-- Ultimo endereço direto
--SELECT "address_id","driver_id" FROM "scans" WHERE "package_id" = (
--   SELECT "id" FROM "packages" WHERE "from_address_id" IS NULL) ORDER BY "timestamp" DESC LIMIT 1;

--SELECT * FROM "scans" WHERE "package_id" = (
  -- SELECT "id" FROM "packages" WHERE "from_address_id" IS NULL) ORDER BY "timestamp" DESC LIMIT 1;


-- Ultimo endereço dos timestamps
--SELECT * FROM "addresses" WHERE "id" = 
--(
--   SELECT "address_id" FROM "scans" WHERE "package_id" = 
--   (
--      SELECT "id" FROM "packages" WHERE "from_address_id" IS NULL 
--   ) ORDER BY "timestamp" DESC LIMIT 1
--);


---VERIFICANDO SE O ENDEREÇO DE ENTREGA ESTÁ CERTO
SELECT * FROM "addresses" WHERE "id" = 
   (
   SELECT "to_address_id" FROM "packages" WHERE "from_address_id" = 
      (
      SELECT "id" FROM "addresses" WHERE "address" = '109 Tileston Street'
      )
    );

-- Verificando o scan
SELECT * FROM "scans" WHERE "package_id" = 
   (
   SELECT "id" FROM "packages" WHERE "from_address_id" = 
      (
      SELECT "id" FROM "addresses" WHERE "address" = '109 Tileston Street'
      )
    );

-- Houve uma entrega e uma coleta no último endereço - ver qual é esse endereço (7432), e depois
-- nenhuma entrega

 -- SELECT * FROM "addresses" WHERE "id" = 7432;

-- é um depósito, 

-- Verificar o nome do motorista -- Mikel está com o pacote!
SELECT * FROM "drivers" WHERE "id" = 17;








