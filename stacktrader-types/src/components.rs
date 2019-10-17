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
        let azimuth = ab.1.atan2(ab.0) * 180.0 / std::f64::consts::PI;
        let elevation = (ab.2 / d).acos() * 180.0 / std::f64::consts::PI;

        TargetVector {
            mag: d.round() as u32,
            ux: ab.0 / d,
            uy: ab.1 / d,
            uz: ab.2 / d,
            azimuth,
            elevation,
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
    pub azimuth: f64,
    pub elevation: f64,
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
    pub azimuth: f64,
    pub elevation: f64,
}

#[cfg(test)]
mod test {
    use super::{Position, Velocity};

    const FLOATEPSILON: f64 = std::f64::EPSILON;
    const PI: f64 = std::f64::consts::PI;
    const DEGREE_CONVERSION: f64 = 180.0 / PI;

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

    #[test]
    fn simple_azimuth_elevation() {
        let p1 = Position::new(0.0, 0.0, 0.0);
        let p2 = Position::new(2.0 * 3.0_f64.sqrt(), 6.0, -4.0);

        // distance = 8
        // azimuth = pi/3, elevation = 2pi/3

        let v = p1.vector_to(&p2);

        assert_eq!(8, v.mag);
        assert!((PI / 3.0 - v.azimuth / DEGREE_CONVERSION) <= FLOATEPSILON);
        assert!((2.0 * PI / 3.0 - v.elevation / DEGREE_CONVERSION) <= FLOATEPSILON);

        assert!((PI / 3.0 * DEGREE_CONVERSION - v.azimuth) <= FLOATEPSILON);
        assert!((2.0 * PI / 3.0 * DEGREE_CONVERSION - v.elevation) <= FLOATEPSILON);
    }

    #[test]
    fn complicated_azimuth_elevation() {
        let p1 = Position::new(647.5, 143.6, 987.0);
        let p2 = Position::new(1_200.12, -60.14, 654.0);

        // dx = 552.61999999
        // dy = -203.74
        // dz = -333
        // distance = 676.6002
        // azimuth = -20.2379 deg
        // elevation = 60.5169 deg

        let v = p1.vector_to(&p2);

        assert_eq!(677, v.mag);
        assert!((-20.23792710183053 - v.azimuth) <= FLOATEPSILON);
        assert!((60.5169 - v.elevation) <= FLOATEPSILON);
    }

    #[test]
    fn complicated_reverse_azimuth_elevation() {
        let p1 = Position::new(1_200.12, -60.14, 654.0);
        let p2 = Position::new(647.5, 143.6, 987.0);

        // dx = -552.61999999
        // dy = 203.74
        // dz = 333
        // distance = 676.6002
        // azimuth = 159.762 deg
        // elevation = 60.5169 deg

        let v = p1.vector_to(&p2);

        assert_eq!(677, v.mag);
        assert!((159.762 - v.azimuth) <= FLOATEPSILON);
        assert!((60.5169 - v.elevation) <= FLOATEPSILON);
    }
}
