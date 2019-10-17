const ResClient = resclient.default;
let client = new ResClient('ws://localhost:8080');
let root = document.getElementById("root");
let player1 = document.getElementById("player1");

/// Get list of systems discovered by the system manager
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

/// Creating the_void shard and setting up player1 & demo
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
    });
}).catch(err => {
    console.log(err);
    document.body.textContent = "Error getting model. Are NATS Server and Resgate running?";
});

/**
 * Helper function to create player1 and its necessary components of:
 * position, velocity, radar_receiver
 */
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

/**
 * On a 2 second loop, attempt to get player1 radar_contacts
 * This should happen immediately when discovering contacts, but just in case keep trying
 * 
 * This function gets contacts and defines onChange, onAdd and onRemove functions to update the contacts list
 */
let player1RadarContacts = () => {
    client.get('decs.components.the_void.player1.radar_contacts').then(res => {
        res._list.forEach(c => {
            c.on('change', _x => {
                updateP1Contacts(res._list)
            })
        })
        if (res._list && res._list.length > 1) {
            updateP1Contacts(res._list)
        }
        res.on('remove', _c => {
            if (res._list && res._list.length > 1) {
                updateP1Contacts(res._list)
            } else {
                document.getElementById("player1_contacts").innerText = 'No current contacts';
            }
        })
        res.on('add', change => {
            updateP1Contacts(res._list)
            if (change.item) {
                change.item.on('change', c => {
                    updateP1Contacts(res._list)
                })
            }
        })
    }).catch(err => {
        setTimeout(() =>
            player1RadarContacts(client), 2000);
    })
}

/**
 * Helper function to update the radar_contacts list in the UI
 * @param reslist: Resgate's list of components in the collection of contacts
 */
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

/**
 * Function to navigate player1 towards a certain target
 * @param {string} target: entity_id of target
 */
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

/**
 * Helper function to create a naive entity with position and no velocity
 * @param {String} name entity_id of new entity
 * @param {Number} x x position (in km)
 * @param {Number} y y posiiton (in km)
 * @param {Number} z z position (in km)
 */
let setupEntity = (name, x, y, z) => {
    let position = { x, y, z };
    let velocity = { "mag": 0, "ux": 1.0, "uy": 1.0, "uz": 1.0 };
    client.call(`decs.components.the_void.${name}.velocity`, 'set', velocity);
    client.call(`decs.components.the_void.${name}.position`, 'set', position);
}

/**
 * Helper function to create non-player entities for demo purposes
 */
let setupRadarDemo = () => {
    setupEntity("asteroid", -1, -1, -1);
    setupEntity("iron_ore", 1, 1, 1);
    setupEntity("money", 3, 3, 3);
    setupEntity("spaceship", 5, 5, 5);
    setupEntity("gold_ore", 9, 9, 9);
    setupEntity("starbase", 10, 10, 10);
    //Timeout to show shard count updating with new entities
    setTimeout(() => {
        setupEntity("enemy_spaceship", 12, 12, 12);
        setupEntity("enemy_spaceship2", 12, 12, 12);
        setupEntity("enemy_spaceship3", 12, 12, 12);
        setupEntity("enemy_spaceship5", 12, 12, 12);
    }, 5000)
}

/**
 * Function called from the UI's Change Velocity button to set player1's velocity
 */
let changeVelocity = (_event) => {
    let mag = Number.parseFloat(document.getElementById("magnitude").value);
    let ux = Number.parseFloat(document.getElementById("ux").value);
    let uy = Number.parseFloat(document.getElementById("uy").value);
    let uz = Number.parseFloat(document.getElementById("uz").value);
    let velocity = { mag, ux, uy, uz };
    client.call('decs.components.the_void.player1.velocity', 'set', velocity)
}