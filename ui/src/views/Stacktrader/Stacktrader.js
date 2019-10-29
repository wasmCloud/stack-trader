import React, { Component } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Progress,
  Row,
  Table,
  Button,
} from 'reactstrap';
import Radar from './Radar'

import ResClient from 'resclient';

// class Position {
//   x;
//   y;
//   z;

//   constructor(x, y, z) {
//     this.x = x;
//     this.y = y;
//     this.z = z;
//   }
// }

// class Velocity {
//   mag;
//   ux;
//   uy;
//   uz;

//   constructor(mag, ux, uy, uz) {
//     this.mag = mag;
//     this.ux = ux;
//     this.uy = uy;
//     this.uz = uz;
//   }
// }

class Stacktrader extends Component {
  client;

  constructor(props) {
    super(props);

    this.client = new ResClient('ws://localhost:8080')

    this.state = {
      dropdownOpen: new Array(30).fill(false),
      /**
       * Player components
       */
      entity_id: "",
      shard: "",
      // position: new Position(0.0, 0.0, 0.0),
      // velocity: new Velocity(0, 1.0, 1.0, 0.0),
      position: { x: 0.0, y: 0.0, z: 0.0 },
      velocity: { mag: 0, ux: 0.0, uy: 0.0, uz: 0.0 },
      contacts: [],
      target: null,
      target_name: "",
      radar_receiver: null,
      inventory: []
    };
  }

  componentDidMount() {
    this.setupPlayer("Player1", "the_void");
  }

  setupPlayer(entity_id, shard) {
    this.setState({ entity_id })
    this.setState({ shard })
    this.setupLocalDemo(); //TODO: Remove after connecting genesis
  }

  /**
   * Change handler for velocity change
   */
  handlePositionChange = (change) => {
    let position = {
      x: change.x ? change.x : this.state.position.x,
      y: change.y ? change.y : this.state.position.y,
      z: change.z ? change.z : this.state.position.z,
    }
    this.setState({ position })
    this.onUpdate()
  }

  /**
   * Send `set` call to RESgate for velocity
   */
  handleVelocityChange = (change) => {
    let velocity = {
      mag: change.mag ? change.mag : this.state.velocity.mag,
      ux: change.ux ? change.ux : this.state.velocity.ux,
      uy: change.uy ? change.uy : this.state.velocity.uy,
      uz: change.uz ? change.uz : this.state.velocity.uz,
    }
    this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.velocity`, 'set', velocity)
  }

  /**
   * Given an rid, navigate the current player to that target
   */
  setTarget = (rid) => {
    if (rid === 'delete') {
      this.setState({ target: null })
      return
    }
    let target = {
      "rid": `${rid}`,
      "eta_ms": 999999.9,
      "distance_km": 9990.0
    }
    this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.target`, 'set', target).then(_res => {
      this.client.get(`decs.components.${this.state.shard}.${this.state.entity_id}.target`).then(target => {
        this.setState({ target })
        this.getNameForRid(target.rid)
        target.on('change', this.onUpdate)
      })
    })
  }

  /**
   * Given a contact, make the player navigate to that contact
   */
  navigateToTarget = (contact) => {
    let azimuth = contact.azimuth * Math.PI / 180
    let ux = Math.cos(azimuth)
    let uy = Math.sin(azimuth)
    let uz = Number.parseFloat(((contact.elevation - 90) / - 90).toPrecision(1))
    // Setting magnitude to be at least 100, to start moving the player there
    let mag = this.state.velocity.mag < 100 ? 100 : this.state.velocity.mag
    let velocity = { mag, ux, uy, uz }

    this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.velocity`, 'set', velocity).then(_res => {
      this.setTarget(`decs.components.${this.state.shard}.${contact.entity_id}`)
    })
  }

  extractResource = (target) => {
    let rid = `${target}.mining_resource`
    let fps = 1 //TODO: Change if FPS changes
    this.client.get(rid).then(mining_resource => {
      let extractor = {
        target: rid,
        remaining_ms: (mining_resource.qty / fps) * 1000
      }
      this.client.get(`${target}.mining_lock`).then(_res => {
        console.log("Resource is already being mined")
      }).catch(_err => {
        this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.extractor`, 'set', extractor).then(_res => {
          this.client.call(`${target}.mining_lock`, 'set', { extractor: `decs.components.${this.state.shard}.${this.state.entity_id}.extractor` })
        })
      })
    })
  }

  /**
   * Helper function to retrieve a Target's UI friendly name from its rid
   */
  getNameForRid = (rid) => {
    this.client.get(`${rid}.transponder`).then(transponder => {
      this.setState({ target_name: transponder.display_name })
    })
  }

  /**
   * Helper function to trigger on RESgate responses, to rerender the changed state
   */
  onUpdate = () => {
    this.setState({})
  }

  loading = () => <div className="animated fadeIn pt-1 text-center">Loading...</div>

  getAzimuth = () => {
    let ux = this.state.velocity.ux
    let uy = this.state.velocity.uy
    let azimuth = Math.round(Math.atan(uy / ux) * 180 / Math.PI)
    if (ux < 0) {
      azimuth += 180
    } else if (ux > 0 && uy < 0) {
      azimuth += 360
    }
    return azimuth
  }

  render() {

    return (
      <div className="animated fadeIn">
        <Row>
          <Col md="6">
            <Card className="card-accent-primary">
              <CardHeader>
                {this.state.entity_id}
              </CardHeader>
              <CardBody>
                <Row>
                  <Col>
                    <Row>
                      <strong>Position:</strong>
                    </Row>
                    <Row>
                      x: {this.state.position.x.toPrecision(3)}
                    </Row>
                    <Row>
                      y: {this.state.position.y.toPrecision(3)}
                    </Row>
                    <Row>
                      z: {this.state.position.z.toPrecision(3)}
                    </Row>
                  </Col>
                  <Col>
                    <Row>
                      <strong>Velocity:</strong>
                    </Row>
                    <Row>
                      Magnitude (km/hr): <input type="range" min={0} max={3600} value={this.state.velocity.mag} step={10} class="slider" id="velocityMagnitude"
                        onInput={(e) => {
                          let velocity = this.state.velocity
                          velocity.mag = Number.parseInt(e.target.value)
                          this.setState({ velocity })
                        }}
                        onMouseUp={(e) => this.handleVelocityChange({ mag: Number.parseInt(e.target.value) })}
                        onPointerUp={(e) => this.handleVelocityChange({ mag: Number.parseInt(e.target.value) })} /> {this.state.velocity.mag}
                    </Row>
                    <Row>
                      Direction: <input type="range" min="0" max="360" value={this.getAzimuth()}
                        onInput={(e) => {
                          let angle = Number.parseInt(e.target.value) * Math.PI / 180
                          let ux = Math.cos(angle)
                          let uy = Math.sin(angle)
                          let velocity = this.state.velocity
                          velocity.ux = ux
                          velocity.uy = uy
                          this.setState({ velocity })
                        }}
                        onMouseUp={(e) => {
                          let angle = Number.parseInt(e.target.value) * Math.PI / 180
                          let ux = Math.cos(angle)
                          let uy = Math.sin(angle)
                          this.handleVelocityChange({ ux, uy })
                        }}
                        onTouchEnd={(e) => {
                          let angle = Number.parseInt(e.target.value) * Math.PI / 180
                          let ux = Math.cos(angle)
                          let uy = Math.sin(angle)
                          this.handleVelocityChange({ ux, uy })
                        }} step="1" class="slider" id="velocityDirection" />
                      <div style={{ width: '24px', height: '24px', transform: `rotate(${this.getAzimuth() <= 180 ? 90 - this.getAzimuth() : (this.getAzimuth() - 90) * -1}deg)` }}><i className="icon-arrow-up-circle font-2xl"></i></div>
                    </Row>
                    <Row>
                      Elevation: <input type="range" min={-1} max={1} value={this.state.velocity.uz} step={0.1} class="slider" id="velocityDirection"
                        onInput={(e) => {
                          let velocity = this.state.velocity
                          velocity.uz = Number.parseFloat(e.target.value)
                          this.setState({ velocity })
                        }}
                        onMouseUp={(e) => this.handleVelocityChange({ uz: Number.parseFloat(e.target.value) })}
                        onTouchEnd={(e) => this.handleVelocityChange({ uz: Number.parseFloat(e.target.value) })} />
                      <div style={{ width: '24px', height: '24px', transform: `rotate(${this.state.velocity.uz > 0 ? 0 : 180}deg)` }}>
                        <i className={`${this.state.velocity.uz === 0 ? 'icon-arrow-dot-circle' : 'icon-arrow-up-circle'} font-2xl`}></i>
                      </div>
                    </Row>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col md="3">
            <Card className="card-accent-primary">
              <CardHeader>
                Inventory
              </CardHeader>
              <CardBody>
                {this.state.inventory.map(item =>
                  <div>item: {item}</div>
                )}
              </CardBody>
            </Card>
          </Col>
          <Col md="3">
            <Card className="card-accent-primary">
              <CardHeader>
                Target
              </CardHeader>
              {this.state.target ? <CardBody>
                Targeting: {this.state.target_name} <br />
                Distance:  {this.state.target.eta_ms > 0.0 ? this.state.target.distance_km.toPrecision(2) + "km" : "Target within range"} <br />
                ETA: {`${Math.floor(this.state.target.eta_ms / 1000 / 60 / 60)}h/
                    ${Math.floor(this.state.target.eta_ms / 1000 / 60)}m/
                    ${(this.state.target.eta_ms / 1000).toPrecision(3)}s`} <br />
                <br />

                <Progress animated className="mb-3"
                  color={this.state.target.eta_ms <= 0.0 ? "success" : "primary"}
                  value={this.state.target.eta_ms <= 0.0 ? 100 :
                    this.state.target.distance_km >= this.state.radar_receiver.radius ? 0 :
                      100 * (this.state.radar_receiver.radius - Number.parseFloat(this.state.target.distance_km)) / this.state.radar_receiver.radius} />
              </CardBody>
                :
                <CardBody>
                  Targeting: No current target <br />
                  Distance: N/A <br />
                  ETA: N/A <br />
                </CardBody>}
            </Card>
          </Col>
        </Row>

        <Row>
          <Col md="6">
            <Card className="card-accent-info">
              <CardHeader>
                Radar
              </CardHeader>
              <CardBody>
                {this.state.entity_id && <Radar client={this.client} shard={this.state.shard} entity={this.state.entity_id} navigateToTarget={this.setTarget} />}
              </CardBody>
            </Card>
          </Col>
          <Col md="6">
            <Card className="card-accent-info">
              <CardHeader>
                Radar Contacts
                  </CardHeader>
              <CardBody>
                <br />
                <Table hover responsive className="table-outline mb-0 d-sm-table">
                  <thead className="thead-light">
                    <tr>
                      <th className="text-center">Type</th>
                      <th>Contact</th>
                      <th>Distance</th>
                      <th className="text-center">Angle</th>
                      <th className="text-center">Elevation</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {this.state.contacts && Array.from(this.state.contacts).sort((a, b) => a.distance_xy - b.distance_xy).map((contact, idx) =>
                      <tr>
                        <td className="text-center">
                          <div>
                            <span style={{
                              position: "relative",
                              color: contact.transponder.color,
                              transform: `rotate(${contact.transponder.object_type === "ship" ? 180 : 0}deg)`
                            }} className={`${contact.transponder.object_type === "asteroid" ? "fa fa-bullseye" :
                              contact.transponder.object_type === "ship" ? "fa fa-space-shuttle" :
                                contact.transponder.object_type === "starbase" ? "fa fa-fort-awesome" : "fa fa-warning"} fa-lg`}></span>
                          </div>
                        </td>
                        <td>
                          <div>{contact.transponder.display_name}</div>
                        </td>
                        <td>
                          <div className="clearfix">
                            <div className="float-left">
                              <strong>{contact.distance_xy}km</strong>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <div style={{ transform: `rotate(${contact.azimuth <= 180 ? 90 - contact.azimuth : contact.azimuth - 90}deg)` }}>
                            <i className="icon-arrow-up-circle font-2xl"></i>
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="icon-div">
                            <i className={`${contact.elevation === 90 ? "icon-arrow-dot-circle" : contact.elevation < 90 ? "icon-arrow-up-circle" : "icon-arrow-down-circle"} font-2xl`}></i>
                          </div>
                        </td>
                        <td>
                          <Col className="text-center">
                            <Row>
                              <Button style={{ marginBottom: '2px', justifyContent: 'center' }} color="success" size="sm" onClick={() => this.navigateToTarget(contact)}>Navigate</Button>
                            </Row>
                            <Row>
                              <Button style={{ marginBottom: '2px', justifyContent: 'center' }} color="primary" size="sm" onClick={() => this.setTarget(`decs.components.${this.state.shard}.${contact.entity_id}`)}>Target</Button>
                            </Row>
                            {contact.transponder.object_type === "asteroid" && <Row>
                              <Button style={{ justifyContent: 'center' }} color="warning" size="sm" onClick={() => this.extractResource(`decs.components.${this.state.shard}.${contact.entity_id}`)}>Mine</Button>
                            </Row>}
                            {contact.transponder.object_type === "starbase" && <Row>
                              <Button style={{ justifyContent: 'center' }} color="warning" size="sm" onClick={() => console.log("Sell to starbase...")}>Sell</Button>
                            </Row>}
                          </Col>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div >
    );
  }

  // Demo functions begin
  setupLocalDemo() {
    this.client.get('decs.shards').then(_shards => {
      let position = this.state.position;
      let velocity = this.state.velocity;
      let radar_receiver = { "radius": 10.0 };
      let entity = this.state.entity_id

      this.client.call(`decs.components.${this.state.shard}.${entity}.velocity`, 'set', velocity).then(_res => {
        this.client.get(`decs.components.${this.state.shard}.${entity}.velocity`).then(velocity => {
          velocity.on('change', this.onUpdate)
          this.setState({ velocity })
        })
      });
      this.client.call(`decs.components.${this.state.shard}.${entity}.position`, 'set', position).then(_res => {
        this.client.get(`decs.components.${this.state.shard}.${entity}.position`).then(position => {
          position.on('change', this.onUpdate)
          this.setState({ position })
        })
      });
      this.client.call(`decs.components.${this.state.shard}.${entity}.radar_receiver`, 'set', radar_receiver).then(_res => {
        this.client.get(`decs.components.${this.state.shard}.${entity}.radar_receiver`).then(radar_receiver => {
          this.setState({ radar_receiver })
        })
        this.setupRadarDemo()
        setTimeout(() => this.setupRadarContacts(entity), 500)
      })
      this.client.get(`decs.components.${this.state.shard}.${entity}.target`).then(target => {
        this.setState({ target })
        this.getNameForRid(target.rid)
        target.on('change', this.onUpdate)
      }).catch(err => {
        console.log(err)
      })
      this.setupInventory(entity)
    }).catch(err => {
      console.log(err);
    });
  }

  setupInventory(entity) {
    this.client.get(`decs.components.${this.state.shard}.${entity}.inventory`).then(inventory => {
      this.setState({ inventory })
      inventory.on('change', this.onUpdate)
    }).catch(_err => {
      setTimeout(() => this.setupInventory(entity), 1000)
    })
  }

  setupRadarContacts(entity) {
    this.client.get(`decs.components.${this.state.shard}.${entity}.radar_contacts`).then(contacts => {
      contacts.on('add', this.onUpdate)
      contacts.on('remove', this.onUpdate)
      this.setState({ contacts })
    }).catch(err => {
      console.log(err)
      setTimeout(() => this.setupRadarContacts(entity), 1000)
    })
  }

  setupRadarDemo() {
    /**
     * Color guide:
     * CoreUI Danger: f86c6b
     * CoreUI Warning: ffc107
     * CoreUI Primary: 20a8d8
     * CoreUI Success: 4dbd74
     */
    this.setupAsteroid("sapphire_asteroid", "Sapphire Asteroid", -2, -2, -1, "#20a8d8", "spendy");
    this.setupAsteroid("emerald_asteroid", "Emerald Asteroid", -2, 2, -1, "#4dbd74", "spendy");
    this.setupAsteroid("donut_asteroid", "Donut Asteroid", 2, -2, 0, "#f86c6b", "tasty");
    this.setupAsteroid("kubernetes_asteroid", "Kubernetes Asteroid", 2, 2, 0, "#ffc107", "critical");
    this.setupEntity("friendly_spaceship", "Friendly Spaceship", 10, 9, 0, "#4dbd74");
    this.setupEntity("enemy_spaceship", "Enemy Spaceship", 14, 7, 0, "#f86c6b");
    this.setupEntity("starbase_alpha", "Starbase Alpha", 10, 10, 0, "#ffc107");
    this.setupEntity("unknown_spaceship", "Unknown Spaceship", 20, 20, 0, "#ffc107");
  }

  setupAsteroid = (entity_id, name, x, y, z, color, stack_type) => {
    let mining_resource = {
      stack_type,
      qty: entity_id.length
    }
    this.client.call(`decs.components.${this.state.shard}.${entity_id}.mining_resource`, 'set', mining_resource).then(res => {
      // console.log(res)
    }).catch(err => {
      console.log(err)
    })

    this.setupEntity(entity_id, name, x, y, z, color);
  }

  setupEntity(entity_id, name, x, y, z, color) {
    let position = { x, y, z };
    let velocity = { "mag": 0, "ux": 1.0, "uy": 1.0, "uz": 1.0 };
    let transponder = null;
    if (entity_id.includes("asteroid")) {
      transponder = {
        object_type: "asteroid",
        display_name: name,
        color
      }
    } else if (entity_id.includes("ship")) {
      transponder = {
        object_type: "ship",
        display_name: name,
        color
      }
    } else if (entity_id.includes("starbase")) {
      transponder = {
        object_type: "starbase",
        display_name: name,
        color
      }
    } else {
      return
    }
    this.client.call(`decs.components.${this.state.shard}.${entity_id}.transponder`, 'set', transponder);
    this.client.call(`decs.components.${this.state.shard}.${entity_id}.velocity`, 'set', velocity);
    this.client.call(`decs.components.${this.state.shard}.${entity_id}.position`, 'set', position);
  }
  // Demo functions ends
}

export default Stacktrader;
