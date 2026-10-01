import Database from 'better-sqlite3';

const base = 'd:/Seiyu-guess/server/data/';
for (const file of ['seiyuu-bangumi.sqlite3', 'db.sqlite', 'seiyuu-guess.sqlite3']) {
  try {
    const db = new Database(base + file, { readonly: true, fileMustExist: true });
    const tables = db.prepare("select name from sqlite_master where type='table'").all();
    console.log('==', file, tables.map((t) => t.name).join(', '));
    for (const table of tables) {
      if (/sqlite_/i.test(table.name)) continue;
      const cols = db.prepare(`pragma table_info(${table.name})`).all();
      const count = db.prepare(`select count(*) as c from ${table.name}`).get();
      console.log('   -', table.name, `(${count.c} rows)`);
      console.log('     cols:', cols.map((c) => c.name).join(', '));
    }
    db.close();
  } catch (error) {
    console.log('==', file, 'ERR', error.message);
  }
}
