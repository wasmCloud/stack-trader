/// Represents a position in 3-dimensional space, assumed unit is Kilometers
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Position {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

/// Represents a velocity, which includes a magnitude and a direction. The direction
/// is represented by a unit vector (normalized values between 0-1). Magnitude is in KPH
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Velocity {
    pub mag: u32,
    pub ux: f32,
    pub uy: f32,
    pub uz: f32,
}
