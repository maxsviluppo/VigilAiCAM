
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Read .env manually since we are in a script
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!url || !key) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(url, key);

async function restore() {
    console.log("Ripristino telecamera C220...");
    const { data: cams } = await supabase.from('cameras').select('*');
    
    if (!cams || cams.length === 0) {
        console.log("Nessuna camera trovata.");
        return;
    }

    for (const cam of cams) {
        if (cam.name.includes('C220') || cam.username === 'Testcamera' || cam.ip === '192.168.1.17') {
            console.log(`Ripristino ${cam.name}...`);
            const { error } = await supabase.from('cameras').update({
                ip: '192.168.1.17',
                port: 554,
                username: 'Testcamera',
                password: '12345678',
                url: 'rtsp://Testcamera:12345678@192.168.1.17:554/stream1',
                rtsp_path: '/stream1'
            }).eq('id', cam.id);
            
            if (error) console.error("Errore:", error);
            else console.log("Successo!");
        }
    }
}

restore();
