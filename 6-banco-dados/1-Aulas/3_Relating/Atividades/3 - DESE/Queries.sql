-- 1
SELECT "name","city" FROM "schools" WHERE "type" = "Public School";

-- 2
SELECT "name" FROM "districts" WHERE "name" LIKE '%non-op%';

-- 3
SELECT AVG("per_pupil_expenditure") AS "Média por estudante" FROM "expenditures";

-- 4
SELECT "city",COUNT("id") AS 'Total de escolas' FROM "schools" GROUP BY "city" 
ORDER BY "Total de escolas" DESC, "city" ASC
LIMIT 10;

-- 5 (imprimindo o tipo de escola também)
-- find cities with 3 or fewer public schools. Your query should return the names of the 
-- cities and the number of public schools within them, ordered from greatest number of 
-- public schools to least. If two cities have the same number of public schools, order 
-- them alphabetically
SELECT "city","Total de escolas","type" FROM (
    SELECT "city",COUNT("id") AS 'Total de escolas',"type"  FROM "schools" WHERE "type" = "Public School" GROUP BY "city"
    ) WHERE ("Total de escolas" <= 3) ORDER BY "Total de escolas" DESC,"city" ASC;



-- 6 Which schools achieved a 100% graduation rate.
SELECT "name" FROM "schools" WHERE "id" IN (
   SELECT "school_id" FROM "graduation_rates" WHERE "graduated" = 100);

-- 7
SELECT "name" FROM "schools" WHERE "district_id" = (
  SELECT "id" FROM "districts" WHERE "name" = "Cambridge");

-- 8 (o expenditure não tem registros dos distritos que não estão mais funcionando, usando o LEFT JOIN
-- fica fácil de visualizar essa situação -  para mostrar só os ativos basta usar o INNER JOIN
 SELECT * FROM "districts"
 LEFT JOIN "expenditures" 
 ON "expenditures"."district_id" = "districts"."id";

-- USANDO O JOIN COMPLETO
SELECT * FROM "districts"
JOIN "expenditures" 
ON "expenditures"."district_id" = "districts"."id";


-- 9
 SELECT * FROM "districts"
 JOIN "expenditures" 
 ON "expenditures"."district_id" = "districts"."id"
 ORDER BY "pupils" ASC LIMIT 10;

-- 10 
SELECT "districts".name,"expenditures"."per_pupil_expenditure" FROM 
"expenditures" 
JOIN "districts" ON
"districts".id = "expenditures".district_id
ORDER BY "expenditures".per_pupil_expenditure DESC LIMIT 10;

-- 11 -- LEFT JOIN pq tem valores faltantes de per_pupil_expenditure
--SELECT
--  "schools"."district_id",
--  "schools"."id" AS 'school_id',
--  "schools"."name",
--  "per_pupil_expenditure" ,
--  "graduation_rates".graduated
--FROM "schools"
--LEFT JOIN "expenditures"
--ON "schools"."district_id" = "expenditures".district_id 
--LEFT JOIN "graduation_rates"
--ON "schools"."id" = "graduation_rates"."school_id" 
--ORDER BY "per_pupil_expenditure";

-- Somente com JOINS (para não ter valores faltantes)
 SELECT
  "schools"."district_id",
  "schools"."id" AS 'school_id',
  "schools"."name",
  "per_pupil_expenditure" ,
  "graduation_rates".graduated
FROM "schools"
JOIN "expenditures"
ON "schools"."district_id" = "expenditures".district_id 
JOIN "graduation_rates"
ON "schools"."id" = "graduation_rates"."school_id" 
ORDER BY "per_pupil_expenditure";


-- 12
-- In 12.sql, write a SQL query to find public school districts with above-average per-pupil expenditures and an 
-- above-average percentage of teachers rated “exemplary”. Your query should return the districts’ names, along with 
-- their per-pupil expenditures and percentage of teachers rated exemplary. Sort the results first by the percentage of 
-- teachers rated exemplary (high to low), then by the per-pupil expenditure (high to low).

SELECT * FROM "districts" WHERE ("type" = "Public School District") AND NOT ("name" LIKE '%non-op%');

-- DISTRITOS DE ESCOLAS PUBLICAS

-- A média de expenditures é:
SELECT AVG("per_pupil_expenditure") FROM "expenditures";


-- A média dos professores marcados como "exemplary"
SELECT AVG("exemplary") FROM "staff_evaluations";
    

-- OBS: O JOIN DEVE FICAR ANTES DAS CLAUSULAS WHERE, ENTÃO PRIMEIRO CRIAMOS O JOIN DAS DUAS
-- TABELAS, E DEPOIS COLOCAMOS TODAS AS CONDIÇÕES ABAIXO. LIGAMOS ELAS
SELECT "districts"."name", "expenditures"."per_pupil_expenditure","staff_evaluations"."exemplary" FROM "districts"
JOIN "expenditures" ON "districts"."id" = "expenditures"."district_id"
JOIN "staff_evaluations" ON "districts"."id" = "staff_evaluations".district_id
WHERE "districts"."type" = "Public School District"
AND "expenditures"."per_pupil_expenditure" >
    (SELECT AVG("per_pupil_expenditure") FROM "expenditures")
AND
    ("staff_evaluations".exemplary > 
        (SELECT AVG("exemplary") FROM "staff_evaluations")
    );






