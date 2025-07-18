const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'pilona.db');

console.log('Añadiendo columna COIL_ELECTROVALVULA a la tabla PILONAS...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err);
        process.exit(1);
    }
    console.log('Base de datos abierta correctamente');
});

// Añadir la columna COIL_ELECTROVALVULA
db.run(`
    ALTER TABLE PILONAS 
    ADD COLUMN COIL_ELECTROVALVULA INTEGER DEFAULT NULL
`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('La columna COIL_ELECTROVALVULA ya existe');
        } else {
            console.error('Error al añadir columna COIL_ELECTROVALVULA:', err);
        }
    } else {
        console.log('✓ Columna COIL_ELECTROVALVULA añadida correctamente');
    }
    
    // Añadir también las columnas para tipo y modo
    db.run(`
        ALTER TABLE PILONAS 
        ADD COLUMN TIPO_COIL_ELECTROVALVULA TEXT DEFAULT 'COIL'
    `, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('La columna TIPO_COIL_ELECTROVALVULA ya existe');
            } else {
                console.error('Error al añadir columna TIPO_COIL_ELECTROVALVULA:', err);
            }
        } else {
            console.log('✓ Columna TIPO_COIL_ELECTROVALVULA añadida correctamente');
        }
        
        db.run(`
            ALTER TABLE PILONAS 
            ADD COLUMN MODO_COIL_ELECTROVALVULA TEXT DEFAULT 'R'
        `, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log('La columna MODO_COIL_ELECTROVALVULA ya existe');
                } else {
                    console.error('Error al añadir columna MODO_COIL_ELECTROVALVULA:', err);
                }
            } else {
                console.log('✓ Columna MODO_COIL_ELECTROVALVULA añadida correctamente');
            }
            
            // Verificar la estructura actualizada
            db.all("PRAGMA table_info(PILONAS)", (err, columns) => {
                if (err) {
                    console.error('Error al obtener información de la tabla:', err);
                } else {
                    console.log('\nColumnas actuales de la tabla PILONAS:');
                    const electrovalvulaColumns = columns.filter(col => 
                        col.name.includes('ELECTROVALVULA')
                    );
                    
                    if (electrovalvulaColumns.length > 0) {
                        console.log('\nColumnas de Electroválvula encontradas:');
                        electrovalvulaColumns.forEach(col => {
                            console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'} default: ${col.dflt_value}`);
                        });
                    } else {
                        console.log('No se encontraron columnas de electroválvula');
                    }
                }
                
                // Cerrar la base de datos
                db.close((err) => {
                    if (err) {
                        console.error('Error al cerrar la base de datos:', err);
                    } else {
                        console.log('\nMigración completada correctamente');
                    }
                });
            });
        });
    });
});
