import React, { Component, lazy, Suspense } from 'react';
import { Bar, Line, Polar, Chart } from 'react-chartjs-2';
import {
  Badge,
  Button,
  ButtonDropdown,
  ButtonGroup,
  ButtonToolbar,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Col,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Progress,
  Row,
  Table,
} from 'reactstrap';
import { CustomTooltips } from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import { getStyle, hexToRgba } from '@coreui/coreui-pro/dist/js/coreui-utilities'

import ResClient from 'resclient';

const client = new ResClient('ws://localhost:8080')

const Widget03 = lazy(() => import('../Widgets/Widget03'));

const brandPrimary = getStyle('--primary')
const brandSuccess = getStyle('--success')
const brandInfo = getStyle('--info')
const brandWarning = getStyle('--warning')
const brandDanger = getStyle('--danger')

// Card Chart 2
const cardChartData2 = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'My First dataset',
      backgroundColor: brandInfo,
      borderColor: 'rgba(255,255,255,.55)',
      data: [1, 18, 9, 17, 34, 22, 11],
    },
  ],
};

const polar = {
  datasets: [
    {
      data: [
        2,
        6,
        4,
        5,
        3,
      ],
      backgroundColor: [
        // 'rgba(0,0,0,0.0)'
        '#FF6384',
        '#4BC0C0',
        '#FFCE56',
        '#E7E9ED',
        '#36A2EB',
      ],
      borderColor: 'rgba(0,0,0,0.0)',
      label: 'My dataset' // for legend
    }],
  labels: [
    'Enemy spaceship',
    'Starbase',
    'Gold ore',
    'Player 2',
    'Asteroid',
  ],
};

const options = {
  tooltips: {
    enabled: false,
    custom: CustomTooltips
  },
  maintainAspectRatio: false,
  animation: {
    animateRotate: false,
    animateScale: true,
  }
}

class Position {
  x;
  y;
  z;

  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class Velocity {
  mag;
  ux;
  uy;
  uz;

  constructor(mag, ux, uy, uz) {
    this.mag = mag;
    this.ux = ux;
    this.uy = uy;
    this.uz = uz;
  }
}

class Stacktrader extends Component {
  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.onRadioBtnClick = this.onRadioBtnClick.bind(this);

    this.state = {
      dropdownOpen: false,
      radioSelected: 2,
      entity: "",
      position: new Position(0.0, 0.0, 4.0),
      velocity: new Velocity(0, 0.0, 0.0, 0.0),
      contacts: [],
      target: null
    };
  }

  componentDidMount() {
    this.setupPlayer1();
  }

  setupPlayer1() {
    this.setState({
      entity: "Player1",
    })
    this.setupLocalDemo();
  }

  handlePositionChange = (change) => {
    let position = {
      x: change.x ? change.x : this.state.position.x,
      y: change.y ? change.y : this.state.position.y,
      z: change.z ? change.z : this.state.position.z,
    }
    this.setState({ position })
  }

  handleVelocityChange = (change) => {
    let velocity = {
      mag: change.mag ? change.mag : this.state.velocity.mag,
      ux: change.ux ? change.ux : this.state.velocity.ux,
      uy: change.uy ? change.uy : this.state.velocity.uy,
      uz: change.uz ? change.uz : this.state.velocity.uz,
    }
    this.setState({ velocity })
  }

  navigateToTarget = (target) => {
    let p1target = {
      "rid": `${target}`,
      "eta_ms": 999999.9,
      "distance_km": 9990.0
    }
    client.call(`decs.components.the_void.Player1.target`, 'set', p1target).then(_res => {
      client.get(`decs.components.the_void.Player1.target`).then(target => {
        this.setState({ target })
        target.on('change', this.onUpdate)
      })
    })
  }

  onUpdate = () => {
    this.setState({})
  }

  // Demo functions begin
  setupLocalDemo() {
    client.get('decs.shards').then(_shards => {
      let position = this.state.position;
      let velocity = this.state.velocity;
      let radar_receiver = { "radius": 6.0 };
      let entity = this.state.entity

      client.call(`decs.components.the_void.${entity}.velocity`, 'set', velocity).then(_res => {
        client.get(`decs.components.the_void.${entity}.velocity`).then(velocity => {
          this.setState({ velocity })
          velocity.on('change', this.handleVelocityChange)
          client.call(`decs.components.the_void.${entity}.velocity`, 'set', { "mag": 7200, "ux": 1.0, "uy": 1.0, "uz": 0.0 })
        })
      });
      client.call(`decs.components.the_void.${entity}.position`, 'set', position).then(_res => {
        client.get(`decs.components.the_void.${entity}.position`).then(position => {
          this.setState({ position })
          position.on('change', this.handlePositionChange)
        })
      });
      client.call(`decs.components.the_void.${entity}.radar_receiver`, 'set', radar_receiver).then(_res => {
        this.setupRadarDemo()
        setTimeout(() => this.setupRadarContacts(entity), 500)
      })
    }).catch(err => {
      console.log(err);
    });
  }

  setupRadarContacts(entity) {
    client.get(`decs.components.the_void.${entity}.radar_contacts`).then(contacts => {
      contacts.on('add', this.onUpdate)
      contacts.on('remove', this.onUpdate)
      this.setState({ contacts })
    }).catch(err => {
      console.log(err)
      setTimeout(() => this.setupRadarContacts(entity), 500)
    })
  }

  setupRadarDemo() {
    this.setupEntity("asteroid", -1, -1, 4);
    this.setupEntity("meteor", 1, 1, 4);
    this.setupEntity("gold_ore", 3, 3, 4);
    this.setupEntity("friendly_spaceship", 5, 5, 5);
    this.setupEntity("enemy_spaceship", 9, 9, 6);
    this.setupEntity("starbase", 10, 10, 7);
    this.setupEntity("center_of_the_univese", 15, 15, 10);
  }

  setupEntity(name, x, y, z) {
    let position = { x, y, z };
    let velocity = { "mag": 0, "ux": 1.0, "uy": 1.0, "uz": 1.0 };
    client.call(`decs.components.the_void.${name}.velocity`, 'set', velocity);
    client.call(`decs.components.the_void.${name}.position`, 'set', position);
  }
  // Demo functions ends

  toggle() {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen,
    });
  }

  onRadioBtnClick(radioSelected) {
    this.setState({
      radioSelected: radioSelected,
    });
  }

  loading = () => <div className="animated fadeIn pt-1 text-center">Loading...</div>

  render() {

    return (
      <div className="animated fadeIn">
        <Row>
          <Col>
            <Card className="card-accent-success">
              <CardHeader>
                {this.state.entity}
              </CardHeader>
              <CardBody>
                <Row>
                  <Col>
                    <strong>Position:</strong> <br />
                    x: {this.state.position.x.toPrecision(3)} <br />
                    y: {this.state.position.y.toPrecision(3)} <br />
                    z: {this.state.position.z.toPrecision(3)} <br />
                  </Col>
                  <Col>
                    <strong>Velocity:</strong><br />
                    mag: {this.state.velocity.mag} <br />
                    ux: {this.state.velocity.ux} <br />
                    uy: {this.state.velocity.uy} <br />
                    uz: {this.state.velocity.uz} <br />
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          {this.state.target && <Col>
            <Card className="card-accent-success">
              <CardHeader>
                Target
              </CardHeader>
              <CardBody>
                Targeting: {this.state.target.rid.split(".")[3]} <br />
                Distance:  {this.state.target.distance_km >= 1.1 ? this.state.target.distance_km.toPrecision(2) + "km" : "Target within range"} <br />
                ETA: {`${Math.floor(this.state.target.eta_ms / 1000 / 60 / 60)}h/
                    ${Math.floor(this.state.target.eta_ms / 1000 / 60)}m/
                    ${(this.state.target.eta_ms / 1000).toPrecision(3)}s`} <br />
              </CardBody>
            </Card>
          </Col>}
          <Col>
            <Card className="card-accent-success">
              <CardHeader>
                {this.state.entity}'s Inventory
              </CardHeader>
              <CardBody>
                Empty
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card>
              <CardHeader>
                Radar Contacts
            </CardHeader>
              <CardBody>
                <br />
                <Table hover responsive className="table-outline mb-0 d-sm-table">
                  <thead className="thead-light">
                    <tr>
                      {/* <th className="text-center"><i className="icon-dashboard"></i></th> */}
                      <th>Contact</th>
                      <th>Distance</th>
                      <th>Azimuth</th>
                      <th>Elevation</th>
                      {/* <th>Navigation</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {this.state.contacts && Array.from(this.state.contacts).map((contact, idx) =>
                      <tr style={{ cursor: 'pointer' }} onClick={() => this.navigateToTarget(`decs.components.the_void.${contact.entity_id}`)}>
                        {/* <td className="text-center">
                          <div className="avatar">
                            <img src={`assets/img/avatars/${idx + 1}.jpg`} className="img-avatar" alt="admin@bootstrapmaster.com" />
                            <span className="avatar-status badge-success"></span>
                          </div>
                        </td> */}
                        <td>
                          <div>{contact.entity_id}</div>
                        </td>
                        <td>
                          <div className="clearfix">
                            <div className="float-left">
                              <strong>{contact.distance}km</strong>
                            </div>
                          </div>
                          <Progress animated className="mb-3" color={(Number.parseFloat(contact.distance) / 6.0) > 0.75 ? "warning" : "success"} value={100 * (Number.parseFloat(contact.distance) / 6.0)} />
                        </td>
                        <td>
                          {contact.azimuth ? contact.azimuth.toPrecision(3) : "NaN"}
                        </td>
                        <td>
                          {contact.elevation ? contact.elevation.toPrecision(3) : "idk"}
                        </td>
                        {/* <td className="text-center">
                      <i className="icon-cursor"></i>
                    </td> */}
                      </tr>
                    )}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
          <Col>
            <Card>
              <CardHeader>
                Radar
              </CardHeader>
              <CardBody>
                <div className="chart-wrapper">
                  <Polar data={polar} options={options} />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}

export default Stacktrader;
