#!/usr/bin/env python3
import json
import sqlite3
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('Uso: build-assistant-sqlite.py <core.json> <saida.sqlite>')

src = Path(sys.argv[1])
out = Path(sys.argv[2])
data = json.loads(src.read_text(encoding='utf-8'))
out.unlink(missing_ok=True)
con = sqlite3.connect(out)
con.execute('PRAGMA journal_mode=WAL')
con.execute('PRAGMA foreign_keys=ON')

con.executescript('''
CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE products (
 id TEXT PRIMARY KEY, sku TEXT NOT NULL, original_sku TEXT NOT NULL, name TEXT NOT NULL,
 reference TEXT, brand TEXT, category TEXT, category_code TEXT, application TEXT,
 tags_json TEXT, searchable_text TEXT, price REAL, stock_status TEXT, warranty_status TEXT, source TEXT
);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_original_sku ON products(original_sku);
CREATE INDEX idx_products_reference ON products(reference);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_search ON products(searchable_text);
CREATE TABLE aliases (alias TEXT PRIMARY KEY, canonical TEXT NOT NULL);
CREATE TABLE typo_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, pattern TEXT NOT NULL, replacement TEXT NOT NULL);
CREATE TABLE units (id INTEGER PRIMARY KEY AUTOINCREMENT, tokens_json TEXT NOT NULL, canonical TEXT NOT NULL, type TEXT NOT NULL);
CREATE TABLE policies (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE sellers (name TEXT PRIMARY KEY, whatsapp TEXT NOT NULL, routing_order INTEGER NOT NULL);
CREATE TABLE quote_examples (id INTEGER PRIMARY KEY AUTOINCREMENT, format TEXT, customer TEXT, cnpj TEXT, note TEXT, items_json TEXT NOT NULL);
CREATE TABLE source_documents (id TEXT PRIMARY KEY, type TEXT, date TEXT, company TEXT, cnpj TEXT, supplier TEXT, items_json TEXT NOT NULL);
CREATE TABLE project_knowledge (id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT NOT NULL, content TEXT NOT NULL);
CREATE TABLE source_files (file TEXT PRIMARY KEY, exported_as TEXT, bytes INTEGER, sha256 TEXT, source_type TEXT NOT NULL);
''')

meta = {
    'package_name': data['manifest']['package_name'],
    'version': data['manifest']['version'],
    'generated_at': data['manifest']['generated_at'],
    'visual_layout_included': str(data['manifest']['visual_layout_included']).lower(),
    'repository': data['manifest']['repository'],
    'product_count': str(data['manifest']['product_count']),
    'business_name': data['business']['name'],
    'city': data['business']['city'],
    'state': data['business']['state'],
    'instagram': data['business']['instagram'],
    'catalog_target': str(data['business']['catalog_target'])
}
con.executemany('INSERT INTO metadata(key,value) VALUES(?,?)', meta.items())

con.executemany('''INSERT INTO products(
 id,sku,original_sku,name,reference,brand,category,category_code,application,tags_json,
 searchable_text,price,stock_status,warranty_status,source
) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', [(
 p['id'],p['sku'],p['original_sku'],p['name'],p.get('reference'),p.get('brand'),p.get('category'),
 p.get('category_code'),p.get('application'),json.dumps(p.get('tags',[]),ensure_ascii=False),
 p.get('searchable_text'),p.get('price'),p.get('stock_status'),p.get('warranty_status'),p.get('source')
) for p in data['products']])

con.executemany('INSERT INTO aliases(alias,canonical) VALUES(?,?)', data['aliases'].items())
con.executemany('INSERT INTO typo_rules(pattern,replacement) VALUES(?,?)', data['typo_rules'])
con.executemany('INSERT INTO units(tokens_json,canonical,type) VALUES(?,?,?)', [
 (json.dumps(x['tokens'],ensure_ascii=False),x['canonical'],x['type']) for x in data['units']
])
con.executemany('INSERT INTO policies(key,value) VALUES(?,?)', [(x['key'],x['value']) for x in data['policies']])
con.executemany('INSERT INTO sellers(name,whatsapp,routing_order) VALUES(?,?,?)', [
 (x['name'],x['whatsapp'],x['routing_order']) for x in data['sellers']
])
con.executemany('INSERT INTO quote_examples(format,customer,cnpj,note,items_json) VALUES(?,?,?,?,?)', [
 (x.get('format'),x.get('customer'),x.get('cnpj'),x.get('note'),json.dumps(x.get('items',[]),ensure_ascii=False))
 for x in data['quote_examples']
])
con.executemany('INSERT INTO source_documents(id,type,date,company,cnpj,supplier,items_json) VALUES(?,?,?,?,?,?,?)', [
 (x['id'],x.get('type'),x.get('date'),x.get('company'),x.get('cnpj'),x.get('supplier'),json.dumps(x.get('items',[]),ensure_ascii=False))
 for x in data['source_documents']
])
con.executemany('INSERT INTO project_knowledge(topic,content) VALUES(?,?)', [
 (x['topic'],x['content']) for x in data['project_knowledge']
])
source_rows=[]
for x in data['source_manifests']['catalog']:
    source_rows.append((x['file'],x['file'],x['bytes'],x['sha256'],'catalog'))
for x in data['source_manifests']['logic']:
    source_rows.append((x['file'],x.get('exported_as'),x['bytes'],x['sha256'],'logic'))
con.executemany('INSERT INTO source_files(file,exported_as,bytes,sha256,source_type) VALUES(?,?,?,?,?)', source_rows)

con.commit()
checks = {
    'products': con.execute('SELECT COUNT(*) FROM products').fetchone()[0],
    'aliases': con.execute('SELECT COUNT(*) FROM aliases').fetchone()[0],
    'policies': con.execute('SELECT COUNT(*) FROM policies').fetchone()[0],
    'source_documents': con.execute('SELECT COUNT(*) FROM source_documents').fetchone()[0],
}
con.execute('PRAGMA wal_checkpoint(TRUNCATE)')
con.close()
print(json.dumps(checks, ensure_ascii=False))
