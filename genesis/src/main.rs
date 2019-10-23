#[macro_use]
extern crate serde_derive;

#[macro_use]
extern crate serde_json;

use natsclient::{AuthenticationStyle, Client, ClientOptions};
use rand::Rng;
use std::error::Error;
use std::fs::File;
use std::io::prelude::*;

use std::path::PathBuf;
use structopt::StructOpt;

#[derive(StructOpt, Debug)]
#[structopt(name = "genesis")]
struct Opt {
    /// Output file
    #[structopt(short, long, parse(from_os_str))]
    input: PathBuf,
}

#[derive(Serialize, Deserialize, Debug, Default)]
struct Point {
    x: i64,
    y: i64,
    z: i64,
}

#[derive(Serialize, Deserialize, Debug, Default)]
struct Distribution {
    spendy: f32,
    tasty: f32,
    critical: f32,
}

#[derive(Serialize, Deserialize, Debug, Default)]
struct UniverseParameters {
    from: Point,
    to: Point,
    asteroids: u32,
    asteroid_adjs: Vec<String>,
    asteroid_colors: Vec<String>,
    starbase_color: String,
    shard_name: String,
    shard_capacity: u32,
    max_stack_qty: u32,
    distribution: Distribution,
}

fn main() -> Result<(), Box<dyn Error>> {
    let opt = Opt::from_args();
    let mut f = File::open(opt.input)?;
    let mut buffer = Vec::new();

    f.read_to_end(&mut buffer)?;
    let params: UniverseParameters = serde_json::from_slice(&buffer)?;

    let opts = ClientOptions::builder()
        .cluster_uris(vec!["nats://localhost:4222".into()])
        .authentication(AuthenticationStyle::Anonymous)
        .build()?;

    let client = Client::from_options(opts)?;
    client.connect()?;

    for x in 0..params.asteroids {
        create_asteroid(&client, &params, x)?;
    }    
    println!(
        "Created {} asteroids in shard {}",
        params.asteroids, params.shard_name
    );

    create_starbase(&client, &params)?;
    println!("Created Starbase Alpha at (0,0,0)");

    Ok(())
}

fn create_starbase(nats: &Client, params: &UniverseParameters) -> Result<(), Box<dyn Error>> {
    let entity_id = "starbase_0";
    create_component(
        nats,
        &format!(
            "decs.components.{}.{}.position",
            params.shard_name, entity_id
        ),
        json!({
            "x": 0.0,
            "y": 0.0,
            "z": 0.0
        }),
    )?;

    let transponder = json!({"object_type": "starbase",
                        "display_name": "Starbase Alpha".to_string(),
                        "hex_color": params.starbase_color});

    create_component(
        nats,
        &format!(
            "decs.components.{}.{}.radar_transponder",
            params.shard_name, entity_id
        ),
        transponder,
    )?;

    Ok(())
}

fn create_asteroid(
    nats: &Client,
    params: &UniverseParameters,
    idx: u32,
) -> Result<(), Box<dyn Error>> {
    let entity_id = format!("asteroid_{}", idx);

    create_component(
        nats,
        &format!(
            "decs.components.{}.{}.radar_transponder",
            params.shard_name, entity_id
        ),
        gen_transponder(params),
    )?;
    create_component(
        nats,
        &format!(
            "decs.components.{}.{}.position",
            params.shard_name, entity_id
        ),
        gen_position(params),
    )?;
    create_component(
        nats,
        &format!(
            "decs.components.{}.{}.mining_resource",
            params.shard_name, entity_id
        ),
        gen_resource(params),
    )?;
    Ok(())
}

fn create_component(
    nats: &Client,
    rid: &str,
    raw: serde_json::Value,
) -> Result<(), Box<dyn Error>> {
    let subject = format!("call.{}.set", rid);

    nats.publish(&subject, &serde_json::to_vec(&raw)?, None)?;    

    Ok(())
}

fn gen_transponder(params: &UniverseParameters) -> serde_json::Value {
    let mut rng = rand::thread_rng();
    let idx = rng.gen_range(0, params.asteroid_adjs.len());

    json!({"object_type": "asteroid",
        "display_name": format!("{} Asteroid", params.asteroid_adjs[idx]),
        "hex_color": params.asteroid_colors[idx]})
}

fn gen_position(params: &UniverseParameters) -> serde_json::Value {
    let mut rng = rand::thread_rng();

    let x: f64 = rng.gen_range(params.from.x, params.to.x) as _;
    let y: f64 = rng.gen_range(params.from.y, params.to.y) as _;
    let z: f64 = rng.gen_range(params.from.z, params.to.z) as _;

    json!({
        "x": x,
        "y": y,
        "z": z
    })
}

fn gen_resource(params: &UniverseParameters) -> serde_json::Value {
    let mut rng = rand::thread_rng();
    let val = rng.gen_range(0.0, 1.0);

    let stack_type = if val <= params.distribution.critical {
        "critical"
    } else if val <= params.distribution.tasty {
        "tasty"
    } else {
        "spendy"
    };
    let qty = rng.gen_range(1, params.max_stack_qty);
    json!({
        "stack_type": stack_type,
        "qty": qty
    })
}
