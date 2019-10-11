const ResClient = resclient.default;
let client = new ResClient('ws://localhost:8080');
let root = document.getElementById("root");
let player1 = document.getElementById("player1");

client.get('decs.systems').then(systems => {
    systems.toArray().forEach(element => {
        var sys = document.createElement("div");
        sys.innerText = element.name + ' (' + element.components + ') @ ' + element.framerate + "fps";
        root.appendChild(sys);
        console.log(element);
    });
}).catch(err => {
    console.log(err);
    document.body.textContent = "Error getting model. Are NATS Server and Resgate running?";
});

client.get('decs.shards').then(shards => {
    setupPlayer1();
    setupRadarDemo();

    shards.toArray().forEach(element => {
        var shard = document.createElement("div");
        shard.id = "shard"
        shard.innerText = element.name + ' (' + element.current + '/' + element.capacity + ');'
        shardroot.appendChild(shard)
        element.on('change', c => {
            document.getElementById('shard').innerText = element.name + ' (' + c.current + '/' + element.capacity + ');'
        });
        console.log(element);
    });
}).catch(err => {
    console.log(err);
    document.body.textContent = "Error getting model. Are NATS Server and Resgate running?";
});

let setupPlayer1 = () => {
    let position = { "x": 0.0, "y": 0.0, "z": 0.0 };
    let velocity = { "mag": 0, "ux": 1.0, "uy": 1.0, "uz": 1.0 };
    let radar_receiver = { "radius": 6.0 };
    client.call('decs.components.the_void.player1.velocity', 'set', velocity).then(res => {
        client.get('decs.components.the_void.player1.velocity').then(vel => {
            document.getElementById("magnitude").value = vel.mag;
            document.getElementById("ux").value = vel.ux;
            document.getElementById("uy").value = vel.uy;
            document.getElementById("uz").value = vel.uz;
            vel.on('change', _change => {
                document.getElementById("magnitude").value = vel.mag;
                document.getElementById("ux").value = vel.ux;
                document.getElementById("uy").value = vel.uy;
                document.getElementById("uz").value = vel.uz;
            })
        })
    });
    var pos = document.createElement("div")
    pos.id = "position"
    player1.appendChild(pos)
    client.call('decs.components.the_void.player1.position', 'set', position).then(res => {
        client.get('decs.components.the_void.player1.position').then(position => {
            pos.innerText = `x: ${position.x.toFixed(3)}\n y: ${position.y.toFixed(3)}\n z: ${position.z.toFixed(3)}`
            position.on('change', change => {
                pos.innerText = `x: ${position.x.toFixed(3)}\n y: ${position.y.toFixed(3)}\n z: ${position.z.toFixed(3)}`
            });
        });
    });
    client.call('decs.components.the_void.player1.radar_receiver', 'set', radar_receiver).then(_res => {
        document.getElementById("radar_receiver").innerText = `Radius: ${radar_receiver.radius}km`
        player1RadarContacts(client);
    })
}

let player1RadarContacts = (client) => {
    client.get('decs.components.the_void.player1.radar_contacts').then(res => {
        res._list.forEach(c => {
            c.on('change', _x => {
                // console.log("CHANGE")
                // console.log(res._list)
                updateP1Contacts(res._list)
            })
        })
        if (res._list && res._list.length > 1) {
            updateP1Contacts(res._list)
        }
        res.on('remove', _c => {
            // console.log("REMOVE")
            // console.log(res._list)
            if (res._list && res._list.length > 1) {
                updateP1Contacts(res._list)
            } else {
                document.getElementById("player1_contacts").innerText = 'No current contacts';
            }
        })
        res.on('add', change => {
            // console.log("ADD")
            // console.log(res._list)
            updateP1Contacts(res._list)
            if (change.item) {
                change.item.on('change', c => {
                    // console.log("CHANGE")
                    // console.log(res._list)
                    updateP1Contacts(res._list)
                })
            }
        })
    }).catch(err => {
        setTimeout(() =>
            player1RadarContacts(client), 2000);
    })
}

let updateP1Contacts = (reslist) => {
    let table = document.createElement('table')
    reslist.forEach(c => {
        let tr = document.createElement('tr')
        tr.onclick = () => navigateToTarget(c.entity_id)
        let s = document.createElement('span')
        s.innerText = `${c.entity_id} is ${c.distance} km away`
        tr.appendChild(s)
        table.appendChild(tr)
    })
    let contacts = document.getElementById("player1_contacts")
    contacts.removeChild(contacts.firstChild)
    contacts.appendChild(table)
}

let navigateToTarget = (target) => {
    let p1target = {
        "rid": `decs.components.the_void.${target}`,
        "eta_ms": 999999.9,
        "distance_km": 9990.0
    }
    client.call(`decs.components.the_void.player1.target`, 'set', p1target).then(_res => {
        client.get(`decs.components.the_void.player1.target`).then(res => {
            document.getElementById("player1_target").innerText = `Target: ${res.rid.split(".")[3]}\nETA: Calculating...\nDistance: Calculating...`
            res.on('change', change => {
                if (change.eta_ms != 999999.9) {
                    if (res.eta_ms <= 150.0) {
                        document.getElementById("player1_target").innerText = `Target: ${res.rid.split(".")[3]}\nETA: Target within range\n Distance: ${res.distance_km.toPrecision(3)} km`
                    } else {
                        let rid = change.rid ? change.rid : res.rid;
                        let eta = change.eta_ms ? change.eta_ms : res.eta_ms;
                        let dis = change.distance_km ? change.distance_km : res.distance_km;
                        let formatETA = `${Math.floor(eta / 1000 / 60 / 60)}h/${Math.floor(eta / 1000 / 60)}m/${(eta / 1000).toPrecision(2)}s`
                        document.getElementById("player1_target").innerText = `Target: ${rid.split(".")[3]}\nETA: ${formatETA}\n Distance: ${dis.toPrecision(3)} km`
                    }
                }
            })
        })

    })
}

let setupEntity = (name, x, y, z) => {
    let position = { x, y, z };
    let velocity = { "mag": 0, "ux": 1.0, "uy": 1.0, "uz": 1.0 };
    // let radar_receiver = { "radius": 50.0 };
    client.call(`decs.components.the_void.${name}.velocity`, 'set', velocity);
    client.call(`decs.components.the_void.${name}.position`, 'set', position);
    // client.call(`decs.components.the_void.${name}.radar_receiver`, 'set', radar_receiver);
}

let setupRadarDemo = () => {
    setupEntity("asteroid", -1, -1, -1);
    setupEntity("iron_ore", 1, 1, 1);
    setupEntity("money", 3, 3, 3);
    setupEntity("spaceship", 5, 5, 5);
    setupEntity("gold_ore", 9, 9, 9);
    setupEntity("starbase", 10, 10, 10);
    setTimeout(() => {
        console.log("new ent")
        setupEntity("enemy_spaceship", 12, 12, 12);
        setupEntity("enemy_spaceship2", 12, 12, 12);
        setupEntity("enemy_spaceship3", 12, 12, 12);
        setupEntity("enemy_spaceship5", 12, 12, 12);
    }, 5000)
}
let changeVelocity = (event) => {
    let mag = Number.parseFloat(document.getElementById("magnitude").value);
    let ux = Number.parseFloat(document.getElementById("ux").value);
    let uy = Number.parseFloat(document.getElementById("uy").value);
    let uz = Number.parseFloat(document.getElementById("uz").value);
    let velocity = { mag, ux, uy, uz };
    client.call('decs.components.the_void.player1.velocity', 'set', velocity)
}