Copiarme de mi local al contenedor del keycloak lo sig: `docker cp css/ fe1a00802184c5fd31728cf430f4e9eeedea90780dbf9bfd09e7f5de9fde9147:/opt/keycloak/themes/sensia-login/login/resources`

Reiniciar el contenedor: `docker restart fe1a00802184c5fd31728cf430f4e9eeedea90780dbf9bfd09e7f5de9fde9147`

Meterme dentro de mi contenedor como root: `docker exec -u 0 -it fe1a00802184c5fd31728cf430f4e9eeedea90780dbf9bfd09e7f5de9fde9147 bash`

- Actualmente si hago algun cambio en los ficheros, con reiniciar el contenedor ya se verian reflejados, NO BORRAR CONTENEDORES