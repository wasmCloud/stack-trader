/// Represents a position in 3-dimensional space, assumed unit is Kilometers
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Position {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

/// Represents a velocity, which includes a magnitude and a direction. The direction
/// is represented by a unit vector (normalized values between 0-1). Magnitude is in KPH
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Velocity {
    pub mag: u32,
    pub ux: f64,
    pub uy: f64,
    pub uz: f64,
}
