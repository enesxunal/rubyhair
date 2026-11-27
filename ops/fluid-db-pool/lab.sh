#!/bin/bash
set -euo pipefail
root=$(mktemp -d /tmp/ruby-fluid-lab.XXXXXX)
name=rubyhair-fluidpool-lab-20261127
trap 'docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$root"' EXIT
project=$(pwd)
cd "$root"
openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj '/CN=Synthetic lab CA' -keyout ca.key -out ca.crt >/dev/null 2>&1
for n in server labuser; do
 openssl req -newkey rsa:2048 -nodes -subj "/CN=$n" -keyout "$n.key" -out "$n.csr" >/dev/null 2>&1
 if [ "$n" = server ]; then printf 'subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\n' > ext; else printf 'extendedKeyUsage=clientAuth\n' > ext; fi
 openssl x509 -req -in "$n.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -days 2 -extfile ext -out "$n.crt" >/dev/null 2>&1
done
openssl pkcs12 -export -keypbe AES-256-CBC -certpbe AES-256-CBC -macalg sha256 -inkey labuser.key -in labuser.crt -certfile ca.crt -out client.p12 -passout pass:synthetic-p12 >/dev/null 2>&1
cat > pg_hba.conf <<'HBA'
local all all trust
hostssl all labuser all scram-sha-256 clientcert=verify-full
host all all all reject
HBA
docker run -d --name "$name" -p 127.0.0.1:55437:5432 -e POSTGRES_USER=labuser -e POSTGRES_DB=lab -e POSTGRES_PASSWORD=synthetic-lab-only postgres:17-alpine >/dev/null
for i in $(seq 1 30); do if docker exec "$name" psql -U labuser -d lab -Atc 'SELECT 1' >/dev/null 2>&1 && docker exec "$name" pg_isready -h 127.0.0.1 -U labuser -d lab >/dev/null 2>&1; then break; fi; sleep 1; done
docker exec "$name" psql -U labuser -d lab -v ON_ERROR_STOP=1 -c 'CREATE TABLE lab_samples(id int PRIMARY KEY,amount int NOT NULL)' >/dev/null
for f in ca.crt server.crt server.key pg_hba.conf; do docker cp "$f" "$name:/var/lib/postgresql/data/$f" >/dev/null; done
docker exec -u 0 "$name" sh -c 'chown postgres:postgres /var/lib/postgresql/data/ca.crt /var/lib/postgresql/data/server.crt /var/lib/postgresql/data/server.key /var/lib/postgresql/data/pg_hba.conf; chmod 600 /var/lib/postgresql/data/server.key'
docker exec "$name" psql -U labuser -d lab -v ON_ERROR_STOP=1 -c "ALTER SYSTEM SET ssl='on'" >/dev/null
docker exec "$name" psql -U labuser -d lab -v ON_ERROR_STOP=1 -c "ALTER SYSTEM SET ssl_ca_file='ca.crt'" >/dev/null
docker restart "$name" >/dev/null
for i in $(seq 1 30); do if docker exec "$name" psql -U labuser -d lab -Atc 'SELECT 1' >/dev/null 2>&1; then break; fi; sleep 1; done
cd "$project"; node ops/fluid-db-pool/lab.cjs "$root"
