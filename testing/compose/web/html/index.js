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
        shard.innerText = element.name + ' (' + element.current + '/' + element.capacity + ');'
        shardroot.appendChild(shard);
        console.log(element);
    });
}).catch(err => {
    console.log(err);
    document.body.textContent = "Error getting model. Are NATS Server and Resgate running?";
});

let setupPlayer1 = () => {
    let position = { "x": 0.0, "y": 0.0, "z": 0.0 };
    let velocity = { "mag": 7200, "ux": 1.0, "uy": 1.0, "uz": 1.0 };
    let radar_receiver = { "radius": 5.0 };
    client.call('decs.components.the_void.player1.velocity', 'set', velocity).then(res => {
        document.getElementById("magnitude").value = velocity.mag;
        document.getElementById("ux").value = velocity.ux;
        document.getElementById("uy").value = velocity.uy;
        document.getElementById("uz").value = velocity.uz;
        client.on('change', change => {
            document.getElementById("magnitude").value = change.mag;
            document.getElementById("ux").value = change.ux;
            document.getElementById("uy").value = change.uy;
            document.getElementById("uz").value = change.uz;
        })
    });
    var pos = document.createElement("div")
    pos.id = "position"
    player1.appendChild(pos)
    client.call('decs.components.the_void.player1.position', 'set', position).then(res => {
        client.get('decs.components.the_void.player1.position').then(position => {
            position.on('change', change => {
                pos.innerText = `x: ${change.x.toFixed(3)}\n y: ${change.y.toFixed(3)}\n z: ${change.z.toFixed(3)}`
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
                document.getElementById("player1_contacts").innerText = res._list.map(c => `${c.entity_id} is ${c.distance} km away`).reduce((m, i) => m + '\n' + i);
            })
        })
        if (res._list && res._list.length > 1) {
            document.getElementById("player1_contacts").innerText = res._list.map(c => `${c.entity_id} is ${c.distance} km away`).reduce((m, i) => m + '\n' + i);
        }
        res.on('remove', change => {
            console.log("REMOVE")
            if (res._list && res._list.length > 1) {
                document.getElementById("player1_contacts").innerText = res._list.map(c => `${c.entity_id} is ${c.distance} km away`).reduce((m, i) => m + '\n' + i);
            } else {
                document.getElementById("player1_contacts").innerText = 'No current contacts';
            }
            console.log(res._list)
        })
        res.on('add', change => {
            console.log("ADD")
            document.getElementById("player1_contacts").innerText = res._list.map(c => `${c.entity_id} is ${c.distance} km away`).reduce((m, i) => m + '\n' + i);
            if (change.item) {
                change.item.on('change', c => {
                    console.log("CHANGE")
                    document.getElementById("player1_contacts").innerText = res._list.map(c => `${c.entity_id} is ${c.distance} km away`).reduce((m, i) => m + '\n' + i);
                    console.log(res._list)
                })
            }
            console.log(res._list)
        })
    }).catch(err => {
        setTimeout(() =>
            player1RadarContacts(client), 500);
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
    setupEntity("iron_ore", 1, 1, 2);
    setupEntity("money", 3, 3, 3);
    setupEntity("spaceship", 5, 5, 5);
    setupEntity("gold_ore", 7, 8, 7);
    setupEntity("starbase", 9, 9, 9);
    setupEntity("enemy_spaceship", 14, 14, 14);
}
let changeVelocity = (event) => {
    let mag = Number.parseFloat(document.getElementById("magnitude").value);
    let ux = Number.parseFloat(document.getElementById("ux").value);
    let uy = Number.parseFloat(document.getElementById("uy").value);
    let uz = Number.parseFloat(document.getElementById("uz").value);
    let velocity = { mag, ux, uy, uz };
    client.call('decs.components.the_void.player1.velocity', 'set', velocity);
}