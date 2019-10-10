const MS_PER_HOUR: f64 = 3_600_000.0;

/// Represents a position in 3-dimensional space, assumed unit is Kilometers
#[derive(Serialize, Deserialize, Debug, Default, Clone, PartialEq, Copy)]
pub struct Position {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Position {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Position { x, y, z }
    }

    /// Computes the straight-line 3-dimensional distance to the target
    pub fn distance_to(&self, target: &Position) -> f64 {
        ((self.x - target.x).powi(2) + (self.y - target.y).powi(2) + (self.z - target.z).powi(2))
            .sqrt()
    }

    /// Computes the time (in milliseconds) to the target based on the current position and velocity. This
    /// does not currently take into account the direction. It assumes that you're heading
    /// toward the target.
    pub fn eta_at(self, target: &Position, vel: &Velocity) -> f64 {
        if vel.mag == 0 {
            return 0.0;
        }
        let d = self.distance_to(target); // kilometers
        let time_h = d / f64::from(vel.mag);
        time_h * MS_PER_HOUR
    }

    /// Computes the unit vector pointing from source to target and the magnitude
    /// of the resulting vector is the distance to that target
    pub fn vector_to(self, target: &Position) -> TargetVector {
        let ab = (target.x - self.x, target.y - self.y, target.z - self.z);
        let d = self.distance_to(&target);
        let heading_xy = ab.1.atan2(ab.0) * 180.0 / std::f64::consts::PI; //TODO: Verify math here, might need to have a change like below
        let heading_z = ab.2.atan() * 360.0 / std::f64::consts::PI * -1.0 + 180.0;

        TargetVector {
            mag: d.round() as u32,
            ux: ab.0 / d,
            uy: ab.1 / d,
            uz: ab.2 / d,
            heading_xy,
            heading_z,
        }
    }
}

/// Represents a velocity, which includes a magnitude and a direction. The direction
/// is represented by a unit vector (normalized values between 0-1). Magnitude is in KPH
#[derive(Serialize, Deserialize, Debug, Default, Clone, PartialEq, Copy)]
pub struct Velocity {
    pub mag: u32,
    pub ux: f64,
    pub uy: f64,
    pub uz: f64,
}

impl Velocity {
    pub fn new(mag: u32, ux: f64, uy: f64, uz: f64) -> Self {
        Velocity { mag, ux, uy, uz }
    }
}

pub type Vector = Velocity;

#[derive(Serialize, Deserialize, Debug, Default, PartialEq, Clone)]
pub struct TargetVector {
    pub mag: u32,
    pub ux: f64,
    pub uy: f64,
    pub uz: f64,
    pub heading_xy: f64, // Number between 0-360 representing xy angle (e.g. whether it's to the left or right)
    pub heading_z: f64, // Number between 0-360 representing z angle (e.g. whether it's above or below)
}

/// Represents a selected target for the navigation system.
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct Target {
    pub rid: String, // The resource ID (e.g. decs.components.the_void.entity25) of the target
    pub eta_ms: f64, // Estimated time of arrival at the target, in milliseconds
    pub distance_km: f64, // Distance to the target in kilometers
}

/// Represents a radar component that scans for entities around the entity with the receiver.
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct RadarReceiver {
    pub radius: f64, // The range of the radar as a radius in km
}

/// Represents a single radar contact
#[derive(Serialize, Deserialize, Debug, Default, PartialEq, Clone)]
pub struct RadarContact {
    pub entity_id: String,
    pub distance: u32,
    pub heading_xy: f64,
    pub heading_z: f64,
}

#[cfg(test)]
mod test {
    use super::{Position, Velocity};

    #[test]
    fn simple_distance_1() {
        let p1 = Position::new(5.0, 7.0, 9.0);
        let p2 = Position::new(10.0, 20.0, 20.0);

        assert_eq!(17.0, p1.distance_to(&p2).trunc());
    }

    #[test]
    fn simple_eta_1() {
        let p1 = Position::new(5.0, 7.0, 9.0);
        let p2 = Position::new(10.0, 20.0, 20.0);

        // About 17.7 km apart at 3,000 kph = ~.0059 hours
        assert_eq!(
            21297.0,
            p1.eta_at(&p2, &Velocity::new(3000, 1.0, 1.0, 1.0)).trunc()
        );
    }

    #[test]
    fn simple_vector_to() {
        let p1 = Position::new(1.0, 3.0, -2.0);
        let p2 = Position::new(-3.0, 1.0, 0.0);

        // d ~= 4.89

        let v = p1.vector_to(&p2);
        assert_eq!(5, v.mag);
        assert_eq!(-0.8164965809277261, v.ux);
        assert_eq!(-0.4082482904638631, v.uy);
        assert_eq!(0.4082482904638631, v.uz);
    }
}
