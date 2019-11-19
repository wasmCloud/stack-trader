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
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter
} from 'reactstrap';
import { Redirect } from 'react-router-dom';
import Radar from './Radar'
import Inventory from './Inventory'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ResClient from 'resclient';

const namor = require('namor')

class Stacktrader extends Component {
  client;

  constructor(props) {
    super(props);

    this.client = new ResClient('/resgate')

    this.state = {
      dropdownOpen: new Array(30).fill(false),
      /**
       * Game state
       */
      fps: 1,
      /**
       * Player default components
       */
      entity_id: this.props.location.username ? this.props.location.username : "",
      shard: this.props.location.shard ? this.props.location.shard : "",
      position: { x: 0.0, y: 0.0, z: 0.0 },
      velocity: { mag: 0, ux: 0.0, uy: 1.0, uz: 0.0 },
      contacts: [],
      initial_distance: 0,
      target: null,
      target_name: "",
      radar_receiver: { "radius": 25.0 },
      inventory: [],
      wallet: null,
      extractor: null,
      mining_resource_eta_ms: 0,
      recently_mined: null,
      display_name: "",
      tutorial: false
    };
  }

  componentDidMount() {
    let entity_id = this.state.entity_id
    let shard = this.state.shard
    if (this.props.location.from === "login") {
      this.loadPlayer(entity_id, shard)
    } else if (this.props.location.from === "register") {
      this.setState({ tutorial: true })
      this.initializePlayer(entity_id, shard)
    } else {
      this.setState({ entity_id: "" })
    }
    this.periodicReRender()
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
      this.client.get(`decs.components.${this.state.shard}.${this.state.entity_id}.target`).then(target => {
        this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.target`, 'delete', target).then(_r => {
          this.setState({ target: null })
        })
      })
      return
    }
    let init_target = {
      "rid": `${rid}`,
      "eta_ms": 999999.9,
      "distance_km": 9990.0
    }
    this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.target`, 'set', init_target).then(_res => {
      this.client.get(`decs.components.${this.state.shard}.${this.state.entity_id}.target`).then(target => {
        this.setState({ initial_distance: null, target })
        this.getNameForRid(target.rid)
        target.on('change', (change) => {
          if (!this.state.initial_distance && change.distance_km < 9990.0) {
            this.setState({ initial_distance: change.distance_km })
          }
          this.onUpdate()
        })
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
    let uz = Number.parseFloat(Math.cos(contact.elevation * Math.PI / 180))

    // Scale UX and UY components to each other (maxing one out at 1.0) and then to the ratio of xy distance vs total distance
    let distanceRatio = contact.distance > 0 ? contact.distance_xy / contact.distance : 0
    ux = ux * distanceRatio
    uy = uy * distanceRatio

    // Setting magnitude to be at least 500, to start moving the player there
    let mag = this.state.velocity.mag === 0 ? 500 : this.state.velocity.mag
    let velocity = { mag, ux, uy, uz }

    this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.velocity`, 'set', velocity).then(_res => {
      this.setTarget(`decs.components.${this.state.shard}.${contact.entity_id}`)
    })
  }

  /**
   * Create necessary components to mine a resource given a target rid
   */
  extractResource = (target) => {
    // TODO: Don't allow this to happen if a player already has an extractor
    let rid = `${target}.mining_resource`
    this.client.get(rid).then(mining_resource => {
      let extractor = {
        target: rid,
        remaining_ms: (mining_resource.qty / this.state.fps) * 1000
      }
      this.setState({ mining_resource_eta_ms: (mining_resource.qty / this.state.fps) * 1000, recently_mined: null })
      this.client.get(`${target}.mining_lock`).then(_res => {
        toast.error("Resource is already being mined")
      }).catch(_err => {
        this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.extractor`, 'set', extractor).then(_res => {
          this.client.call(`${target}.mining_lock`, 'set', { extractor: `decs.components.${this.state.shard}.${this.state.entity_id}.extractor` })
          this.client.get(`decs.components.${this.state.shard}.${this.state.entity_id}.extractor`).then(extractor => {
            this.setState({ extractor })
            extractor.on('change', this.onUpdate)
          })
        })
      })
    })
  }

  /**
   * Take an item from a player's inventory and add it to the sell list for merchant processing
   */
  sellItem = (item) => {
    this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.sell_list`, 'new', item).then(_res => {
      this.client.call(`decs.components.${this.state.shard}.${this.state.entity_id}.inventory`, 'delete', { rid: item._rid })
      this.client.get(`decs.components.${this.state.shard}.${this.state.entity_id}.sell_list`).then(sell_list => {
        sell_list.on('remove', () => {
          if (!this.state.wallet) {
            this.client.get(`decs.components.${this.state.shard}.${this.state.entity_id}.wallet`).then(wallet => {
              wallet.on('change', this.onUpdate)
              this.setState({ wallet })
            })
          }
          this.onUpdate()
        })
      })
    })
  }

  /**
   * Helper function to set a Target's UI friendly name from its rid
   */
  getNameForRid = (rid) => {
    this.client.get(`${rid}.transponder`).then(transponder => {
      this.setState({ target_name: transponder.display_name })
    }).catch(err => {
      console.log(err)
    })
  }

  /**
   * Helper function to determine if a player is within range of a starbase
   */
  withinStarbaseRange = () => {
    let contacts = Array.from(this.state.contacts)
    for (let i = 0; i < contacts.length; i++) {
      if (contacts[i].entity_id === "starbase_0") {
        return contacts[i].distance <= 5.0;
      }
    }
    return false;
  }

  /**
   * Helper function to determine if a player is within range of a specified asteroid
   */
  withinAsteroidRange = (asteroidContact) => {
    return asteroidContact.distance <= 5.0
  }

  /**
   * To track other players, ensure proper rerender every 3s
   */
  periodicReRender = () => {
    this.onUpdate()
    setTimeout(() => this.periodicReRender(), 3000)
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

  redirectToLogin = () => {
    if (this.state.entity_id === "") {
      return <Redirect to={{
        pathname: `/login`
      }} from='/stacktrader' />
    }
  }

  render() {

    return (
      <div className="animated fadeIn">
        {this.redirectToLogin()}
        <ToastContainer position="top-right" autoClose={5000} style={{ zIndex: 1999 }} />
        <Modal isOpen={this.state.tutorial} toggle={() => this.setState({ tutorial: false })}>
          <ModalHeader toggle={this.toggle}>Welcome to StackTrader!</ModalHeader>
          <ModalBody>
            This game is a demonstration of WebAssembly Secure Capabilities Connector.
            Your goal is to navigate around to asteroids in this universe and mine them to extract stacks. After you gather
            some stacks, navigate to the Starbase in your Radar Contacts to sell your stacks and gain credits! On the TV
            at the booth you can see if the amount of credits you have earns you a spot on the leaderboard.
            <hr />
            You can navigate around the universe by modifying the sliders under Velocity, or if you see something in your contacts
            list you can automatically navigate to it by clicking / tapping the "Navigate" button. When you get in range of a starbase,
            you can click the
            <i className="cui-dollar icons font-2xl" style={{ color: `green` }}></i>
            icon to sell your stacks. You can also clear your target by clicking / tapping an empty space on the radar.
            <hr />
            Just as a note, any data we use is solely to distinguish unique players and will be deleted after each demonstration period.
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={() => this.setState({ tutorial: false })}>Close</Button>{' '}
          </ModalFooter>
        </Modal>
        <Row>
          <Col md="6">
            <Card className="card-accent-primary">
              <CardHeader>
                {this.state.entity_id} - {this.state.display_name}
              </CardHeader>
              <CardBody>
                <Row style={{ marginRight: '0px', marginLeft: '0px' }}>
                  <Col xs="3">
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
                  <Col xs="9">
                    <Row>
                      <strong>Velocity:</strong>
                    </Row>
                    <Row>
                      Magnitude:
                      <Row>
                        <Col>
                          <input type="range" min={0} max={3600} value={this.state.velocity.mag} step={10} class="slider" id="velocityMagnitude"
                            onInput={(e) => {
                              let velocity = this.state.velocity
                              velocity.mag = Number.parseInt(e.target.value)
                              this.setState({ velocity })
                            }}
                            onMouseUp={(e) => this.handleVelocityChange({ mag: Number.parseInt(e.target.value) })}
                            onPointerUp={(e) => this.handleVelocityChange({ mag: Number.parseInt(e.target.value) })} />
                        </Col>
                        <Col>
                          {this.state.velocity.mag} km/hr
                        </Col>
                      </Row>
                    </Row>
                    <Row>
                      Direction:
                      <Row>
                        <Col>
                          <input type="range" min="0" max="360" value={this.getAzimuth()}
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
                        </Col>
                        <Col>
                          <div style={{ width: '24px', height: '24px', transform: `rotate(${this.getAzimuth() <= 180 ? 90 - this.getAzimuth() : (this.getAzimuth() - 90) * -1}deg)` }}><i className="icon-arrow-up-circle font-2xl"></i></div>
                        </Col>
                      </Row>
                    </Row>
                    <Row>
                      Elevation:
                      <Row>
                        <Col>
                          <input type="range" min={-1} max={1} value={this.state.velocity.uz.toPrecision(1)} step={0.1} class="slider" id="velocityDirection"
                            onInput={(e) => {
                              let velocity = this.state.velocity
                              velocity.uz = Number.parseFloat(e.target.value)
                              this.setState({ velocity })
                            }}
                            onMouseUp={(e) => this.handleVelocityChange({ uz: Number.parseFloat(e.target.value) })}
                            onTouchEnd={(e) => this.handleVelocityChange({ uz: Number.parseFloat(e.target.value) })} />
                        </Col>
                        <Col>
                          <div style={{ width: '24px', height: '24px', transform: `rotate(${this.state.velocity.uz > 0 ? 0 : 180}deg)` }}>
                            <i className={`${this.state.velocity.uz === 0 ? 'icon-arrow-dot-circle' : 'icon-arrow-up-circle'} font-2xl`}></i>
                          </div>
                        </Col>
                      </Row>
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
                <Inventory inventory={Array.from(this.state.inventory)} wallet={this.state.wallet} withinStarbaseRange={this.withinStarbaseRange} sellItem={this.sellItem} />
                <br />
                {this.state.extractor &&
                  <Progress animated className="mb-3"
                    color={"warning"}
                    value={100 * (this.state.mining_resource_eta_ms - this.state.extractor.remaining_ms) / this.state.mining_resource_eta_ms}>Extracting...</Progress>}
                {this.state.recently_mined &&
                  <Row style={{ marginRight: '0px', marginLeft: '0px' }}>
                    Last mined: {this.state.recently_mined.qty} {this.state.recently_mined.stack_type} stacks
                  </Row>}
              </CardBody>
            </Card>
          </Col>
          <Col md="3">
            <Card className="card-accent-primary">
              <CardHeader>
                Target
              </CardHeader>
              {this.state.target ? <CardBody>
                <Row style={{ marginRight: '0px', marginLeft: '0px' }}>
                  <Col>
                    <Row>
                      Targeting: {this.state.target_name}
                    </Row>
                    <Row>
                      Distance:  {this.state.target.eta_ms > 0.0 || this.state.target.distance_km > 5.0 ? this.state.target.distance_km.toPrecision(3) + "km" : "Target within range"}
                    </Row>
                    <Row>
                      ETA: {`${Math.floor(this.state.target.eta_ms / 1000 / 60 / 60)}h
                      ${Math.floor(this.state.target.eta_ms / 1000 / 60)}m
                      ${((this.state.target.eta_ms / 1000).toPrecision(3) % 60).toPrecision(3)}s`}
                    </Row>
                  </Col>
                </Row>
              </CardBody>
                :
                <CardBody>
                  <Row style={{ marginRight: '0px', marginLeft: '0px' }}>
                    <Col>
                      <Row>
                        Targeting: No current target
                      </Row>
                      <Row>
                        Distance: N/A
                      </Row>
                      <Row>
                        ETA: N/A
                      </Row>
                    </Col>
                  </Row>
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
                {this.state.entity_id && <Radar client={this.client} shard={this.state.shard} entity={this.state.entity_id} navigateToTarget={this.setTarget} playerRotate={this.getAzimuth() <= 180 ? 90 - this.getAzimuth() : (this.getAzimuth() - 90) * -1} />}
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
                <Table hover responsive striped size="sm">
                  <thead>
                    <tr>
                      <th className="text-center">Type</th>
                      <th>Contact</th>
                      <th>Action</th>
                      <th>Distance</th>
                      <th className="text-center">Angle</th>
                      <th className="text-center">Elevation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {this.state.contacts && Array.from(this.state.contacts).filter(c => c.transponder).sort((a, b) => a.distance - b.distance).map((contact, _idx) =>
                      <tr className={this.state.target && this.state.target.rid.split(".")[3] === contact.transponder._rid.split(".")[3] ? "table-success" : ""}>
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
                          <Row style={{ marginLeft: '0px', marginRight: '0px' }}>
                            <Button style={{ marginRight: '2px' }} color="success" size="sm" onClick={() => this.navigateToTarget(contact)}>Navigate</Button>
                            {contact.transponder.object_type === "asteroid" &&
                              this.withinAsteroidRange(contact) &&
                              !contact.transponder.display_name.includes("(depleted)") &&
                              <Button style={{ marginRight: '2px' }} color="warning" size="sm" onClick={() =>
                                this.extractResource(`decs.components.${this.state.shard}.${contact.entity_id}`)
                              }>Mine</Button>
                            }
                          </Row>
                        </td>
                        <td>
                          <div className="clearfix">
                            <div className="float-left">
                              <strong>{contact.distance}km</strong>
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

  /**
   * Helper function to load all player components and populate game state
   */
  loadPlayer = (entity_id, shard) => {
    this.client.get(`decs.components.${shard}.${entity_id}.velocity`).then(velocity => {
      velocity.on('change', this.onUpdate)
      this.setState({ velocity })
    })
    this.client.get(`decs.components.${shard}.${entity_id}.position`).then(position => {
      position.on('change', this.onUpdate)
      this.setState({ position })
    })

    this.client.get(`decs.components.${shard}.${entity_id}.wallet`).then(wallet => {
      wallet.on('change', this.onUpdate)
      this.setState({ wallet })
    }).catch(err => {
      console.log(err)
    })

    // Evaluate if there was previously a target.
    this.client.get(`decs.components.${shard}.${entity_id}.target`).then(target => {
      this.setState({ target })
      this.getNameForRid(target.rid)
      target.on('change', this.onUpdate)
    }).catch(err => {
      console.log(err)
    })

    this.client.get(`decs.components.${shard}.${entity_id}.radar_receiver`).then(radar_receiver => {
      radar_receiver.on('change', this.onUpdate)
      this.setState({ radar_receiver })
    }).catch(err => {
      console.log(err)
    })

    this.client.get(`decs.components.${shard}.${entity_id}.transponder`).then(transponder => {
      this.setState({ display_name: transponder.display_name })
    }).catch(err => {
      console.log(err)
    })

    // Start polling for radar contacts
    this.setupRadarContacts(entity_id)

    // Start polling for player inventory
    this.setupInventory(entity_id)

    this.setState({ entity_id, shard })
  }

  /**
   * Helper function to initialize a player with default values in the universe.
   */
  initializePlayer = (entity_id, shard) => {
    this.setState({ entity_id, shard })
    this.client.get('decs.shards').then(_shards => {
      this.client.get(`decs.components.${shard}.universe.metadata`).then(metadata => {
        let velocity = this.state.velocity;
        let radar_receiver = this.state.radar_receiver;
        // Randomize starting position
        let position = {
          x: Math.floor(Math.random() * (metadata.max_x - metadata.min_x)) + metadata.min_x,
          y: Math.floor(Math.random() * (metadata.max_y - metadata.min_y)) + metadata.min_y,
          z: Math.floor(Math.random() * (metadata.max_z - metadata.min_z)) + metadata.min_z,
        }
        // Create velocity component
        this.client.call(`decs.components.${shard}.${entity_id}.velocity`, 'set', velocity).then(_res => {
          // Create position component
          this.client.call(`decs.components.${shard}.${entity_id}.position`, 'set', position).then(_res => {
            // Create radar_receiver component
            this.client.call(`decs.components.${shard}.${entity_id}.radar_receiver`, 'set', radar_receiver).then(_res => {
              // Create tranponder component so player can be visible to other players
              let display_name = namor.generate({ words: 2 })
              this.client.call(`decs.components.${shard}.${entity_id}.transponder`, 'set', {
                color: "#63c2de",
                display_name,
                object_type: "ship"
              })
              this.loadPlayer(entity_id, shard)
            })
          })
        })

      })
    }).catch(err => {
      console.log(err);
    });
  }

  /**
   * Tries to get an entity's inventory, if unsuccessful retries every second until successful.
   * @param {string} entity_id entity_id that you are interested in
   */
  setupInventory = (entity_id) => {
    this.client.get(`decs.components.${this.state.shard}.${entity_id}.inventory`).then(inventory => {
      inventory.on('remove', this.onUpdate)
      // When a resource is added to the inventory, clear the extractor from the UI and set a recently_mined state.
      inventory.on('add', (add) => {
        if (!add.item) {
          return
        } else if (add.item.qty && add.item.stack_type) {
          this.setState({
            recently_mined: {
              name: this.state.extractor.target,
              qty: add.item.qty,
              stack_type: add.item.stack_type
            },
            extractor: null
          })
          this.setTarget('delete')
          this.onUpdate()
        }
      })
      this.setState({ inventory, extractor: null })
    }).catch(_err => {
      setTimeout(() => this.setupInventory(entity_id), 5000)
    })
  }

  /**
   * Tries to get an entity's radar contacts, if unsuccessful retries every second until successful.
   * @param {string} entity entity_id that you are interested in
   */
  setupRadarContacts(entity) {
    this.client.get(`decs.components.${this.state.shard}.${entity}.radar_contacts`).then(contacts => {
      contacts.on('add', this.onUpdate)
      contacts.on('remove', this.onUpdate)
      contacts.on('change', this.onUpdate)
      this.setState({ contacts })
    }).catch(_err => {
      setTimeout(() => this.setupRadarContacts(entity), 1000)
    })
  }

}

export default Stacktrader;
