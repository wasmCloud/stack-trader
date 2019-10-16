import React, { Component, lazy, Suspense } from 'react';
import { Bar, Line, Polar } from 'react-chartjs-2';
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

// Card Chart 1
const cardChartData1 = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'My First dataset',
      backgroundColor: brandPrimary,
      borderColor: 'rgba(255,255,255,.55)',
      data: [65, 59, 84, 84, 51, 55, 40],
    },
  ],
};

const cardChartOpts1 = {
  tooltips: {
    enabled: false,
    custom: CustomTooltips
  },
  maintainAspectRatio: false,
  legend: {
    display: false,
  },
  scales: {
    xAxes: [
      {
        gridLines: {
          color: 'transparent',
          zeroLineColor: 'transparent',
        },
        ticks: {
          fontSize: 2,
          fontColor: 'transparent',
        },

      }],
    yAxes: [
      {
        display: false,
        ticks: {
          display: false,
          min: Math.min.apply(Math, cardChartData1.datasets[0].data) - 5,
          max: Math.max.apply(Math, cardChartData1.datasets[0].data) + 5,
        },
      }],
  },
  elements: {
    line: {
      borderWidth: 1,
    },
    point: {
      radius: 4,
      hitRadius: 10,
      hoverRadius: 4,
    },
  }
}


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

const cardChartOpts2 = {
  tooltips: {
    enabled: false,
    custom: CustomTooltips
  },
  maintainAspectRatio: false,
  legend: {
    display: false,
  },
  scales: {
    xAxes: [
      {
        gridLines: {
          color: 'transparent',
          zeroLineColor: 'transparent',
        },
        ticks: {
          fontSize: 2,
          fontColor: 'transparent',
        },

      }],
    yAxes: [
      {
        display: false,
        ticks: {
          display: false,
          min: Math.min.apply(Math, cardChartData2.datasets[0].data) - 5,
          max: Math.max.apply(Math, cardChartData2.datasets[0].data) + 5,
        },
      }],
  },
  elements: {
    line: {
      tension: 0.00001,
      borderWidth: 1,
    },
    point: {
      radius: 4,
      hitRadius: 10,
      hoverRadius: 4,
    },
  },
};

// Card Chart 3
const cardChartData3 = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'My First dataset',
      backgroundColor: 'rgba(255,255,255,.2)',
      borderColor: 'rgba(255,255,255,.55)',
      data: [78, 81, 80, 45, 34, 12, 40],
    },
  ],
};

const cardChartOpts3 = {
  tooltips: {
    enabled: false,
    custom: CustomTooltips
  },
  maintainAspectRatio: false,
  legend: {
    display: false,
  },
  scales: {
    xAxes: [
      {
        display: false,
      }],
    yAxes: [
      {
        display: false,
      }],
  },
  elements: {
    line: {
      borderWidth: 2,
    },
    point: {
      radius: 0,
      hitRadius: 10,
      hoverRadius: 4,
    },
  },
};

// Card Chart 4
const cardChartData4 = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April'],
  datasets: [
    {
      label: 'My First dataset',
      backgroundColor: 'rgba(255,255,255,.3)',
      borderColor: 'transparent',
      data: [78, 81, 80, 45, 34, 12, 40, 75, 34, 89, 32, 68, 54, 72, 18, 98],
    },
  ],
};

const cardChartOpts4 = {
  tooltips: {
    enabled: false,
    custom: CustomTooltips
  },
  maintainAspectRatio: false,
  legend: {
    display: false,
  },
  scales: {
    xAxes: [
      {
        display: false,
        barPercentage: 0.6,
      }],
    yAxes: [
      {
        display: false,
      }],
  },
};

// Social Box Chart
const socialBoxData = [
  { data: [65, 59, 84, 84, 51, 55, 40], label: 'facebook' },
  { data: [1, 13, 9, 17, 34, 41, 38], label: 'twitter' },
  { data: [78, 81, 80, 45, 34, 12, 40], label: 'linkedin' },
  { data: [35, 23, 56, 22, 97, 23, 64], label: 'google' },
];

const makeSocialBoxData = (dataSetNo) => {
  const dataset = socialBoxData[dataSetNo];
  const data = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    datasets: [
      {
        backgroundColor: 'rgba(255,255,255,.1)',
        borderColor: 'rgba(255,255,255,.55)',
        pointHoverBackgroundColor: '#fff',
        borderWidth: 2,
        data: dataset.data,
        label: dataset.label,
      },
    ],
  };
  return () => data;
};

const socialChartOpts = {
  tooltips: {
    enabled: false,
    custom: CustomTooltips
  },
  responsive: true,
  maintainAspectRatio: false,
  legend: {
    display: false,
  },
  scales: {
    xAxes: [
      {
        display: false,
      }],
    yAxes: [
      {
        display: false,
      }],
  },
  elements: {
    point: {
      radius: 0,
      hitRadius: 10,
      hoverRadius: 4,
      hoverBorderWidth: 3,
    },
  },
};

// sparkline charts
const sparkLineChartData = [
  {
    data: [35, 23, 56, 22, 97, 23, 64],
    label: 'Connected Players',
  },
  {
    data: [65, 59, 84, 84, 51, 55, 40],
    label: 'Recurring Clients',
  },
  {
    data: [35, 23, 56, 22, 97, 23, 64],
    label: 'Pageviews',
  },
  {
    data: [65, 59, 84, 84, 51, 55, 40],
    label: 'Organic',
  },
  {
    data: [78, 81, 80, 45, 34, 12, 40],
    label: 'CTR',
  },
  {
    data: [1, 13, 9, 17, 34, 41, 38],
    label: 'Bounce Rate',
  },
];

const makeSparkLineData = (dataSetNo, variant) => {
  const dataset = sparkLineChartData[dataSetNo];
  const data = {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    datasets: [
      {
        backgroundColor: 'transparent',
        borderColor: variant ? variant : '#c2cfd6',
        data: dataset.data,
        label: dataset.label,
      },
    ],
  };
  return () => data;
};

const sparklineChartOpts = {
  tooltips: {
    enabled: false,
    custom: CustomTooltips
  },
  responsive: true,
  maintainAspectRatio: true,
  scales: {
    xAxes: [
      {
        display: false,
      }],
    yAxes: [
      {
        display: false,
      }],
  },
  elements: {
    line: {
      borderWidth: 2,
    },
    point: {
      radius: 0,
      hitRadius: 10,
      hoverRadius: 4,
      hoverBorderWidth: 3,
    },
  },
  legend: {
    display: false,
  },
};

// Main Chart

//Random Numbers
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

var elements = 27;
var data1 = [];
var data2 = [];
var data3 = [];

for (var i = 0; i <= elements; i++) {
  data1.push(random(50, 200));
  data2.push(random(80, 100));
  data3.push(65);
}

const mainChart = {
  labels: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  datasets: [
    {
      label: 'My First dataset',
      backgroundColor: hexToRgba(brandInfo, 10),
      borderColor: brandInfo,
      pointHoverBackgroundColor: '#fff',
      borderWidth: 2,
      data: data1,
    },
    {
      label: 'My Second dataset',
      backgroundColor: 'transparent',
      borderColor: brandSuccess,
      pointHoverBackgroundColor: '#fff',
      borderWidth: 2,
      data: data2,
    },
    {
      label: 'My Third dataset',
      backgroundColor: 'transparent',
      borderColor: brandDanger,
      pointHoverBackgroundColor: '#fff',
      borderWidth: 1,
      borderDash: [8, 5],
      data: data3,
    },
  ],
};

const mainChartOpts = {
  tooltips: {
    enabled: false,
    custom: CustomTooltips,
    intersect: true,
    mode: 'index',
    position: 'nearest',
    callbacks: {
      labelColor: function (tooltipItem, chart) {
        return { backgroundColor: chart.data.datasets[tooltipItem.datasetIndex].borderColor }
      }
    }
  },
  maintainAspectRatio: false,
  legend: {
    display: false,
  },
  scales: {
    xAxes: [
      {
        gridLines: {
          drawOnChartArea: false,
        },
      }],
    yAxes: [
      {
        ticks: {
          beginAtZero: true,
          maxTicksLimit: 5,
          stepSize: Math.ceil(250 / 5),
          max: 250,
        },
      }],
  },
  elements: {
    point: {
      radius: 0,
      hitRadius: 10,
      hoverRadius: 4,
      hoverBorderWidth: 3,
    },
  },
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
    'Spaceship',
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

    this.handlePositionChange = this.handlePositionChange.bind(this)
    this.handleVelocityChange = this.handleVelocityChange.bind(this)

    this.state = {
      dropdownOpen: false,
      radioSelected: 2,
      entity: "",
      position: new Position(0.0, 0.0, 0.0),
      velocity: new Velocity(0, 0.0, 0.0, 0.0),
      contacts: [],
    };
  }

  componentDidMount() {
    this.setupPlayer1();
  }

  componentWillUnmount() {
    // this.state.contacts.off('add', this.onUpdate)
    // this.state.contacts.off('remove', this.onUpdate)
  }

  setupPlayer1() {
    this.setState({
      entity: "player1",
    })
    this.setupLocalDemo();
  }

  handlePositionChange(change) {
    let position = {
      x: change.x ? change.x : this.state.position.x,
      y: change.y ? change.y : this.state.position.y,
      z: change.z ? change.z : this.state.position.z,
    }
    this.setState({ position })
  }

  handleVelocityChange(change) {
    let velocity = {
      mag: change.mag ? change.mag : this.state.velocity.mag,
      ux: change.ux ? change.ux : this.state.velocity.ux,
      uy: change.uy ? change.uy : this.state.velocity.uy,
      uz: change.uz ? change.uz : this.state.velocity.uz,
    }
    this.setState({ velocity })
  }

  onUpdate = (entity, event, contacts) => {
    // client.get(`decs.components.the_void.${entity}.radar_contacts`).then(contacts => {
    //   this.setState({ contacts })
    // })
    // console.log(event)
    // console.log(Array.from(contacts))
    // this.setState({ contacts: Array.from(contacts) })
    this.setState({})
  }

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
          client.call(`decs.components.the_void.${entity}.velocity`, 'set', { "mag": 7200, "ux": 1.0, "uy": 1.0, "uz": 1.0 })
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
      contacts.on('add', (e, c) => this.onUpdate(entity, e, c))
      contacts.on('remove', (e, c) => this.onUpdate(entity, e, c))
      this.setState({ contacts })
    }).catch(err => {
      console.log(err)
      setTimeout(() => this.setupRadarContacts(entity), 500)
    })
  }

  setupEntity(name, x, y, z) {
    let position = { x, y, z };
    let velocity = { "mag": 0, "ux": 1.0, "uy": 1.0, "uz": 1.0 };
    client.call(`decs.components.the_void.${name}.velocity`, 'set', velocity);
    client.call(`decs.components.the_void.${name}.position`, 'set', position);
  }

  setupRadarDemo() {
    this.setupEntity("asteroid", -1, -1, -1);
    this.setupEntity("iron_ore", 1, 1, 1);
    this.setupEntity("money", 3, 3, 3);
    this.setupEntity("spaceship", 5, 5, 5);
    this.setupEntity("gold_ore", 9, 9, 9);
    this.setupEntity("starbase", 10, 10, 10);
  }

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
          <Col>
            <Card className="card-accent-success">
              <CardHeader>
                Contacts for {this.state.entity}
              </CardHeader>
              <CardBody>
                {this.state.contacts ? Array.from(this.state.contacts).map(c =>
                  <Row>
                    <div id={c.entity_id}>Entity: {c.entity_id}, Distance: {c.distance}</div>
                  </Row>
                ) : null}
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
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
          <Col>
            <Card>
              <CardHeader>
                Radar Contacts
              </CardHeader>
              <CardBody>
                <br />
                <Table hover responsive className="table-outline mb-0 d-none d-sm-table">
                  <thead className="thead-light">
                    <tr>
                      <th className="text-center"><i className="icon-cursor"></i></th>
                      <th>Contact entity</th>
                      <th>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* CONTACTS: The idea here is to iterate through the contacts and create a table row for each one. */}
                    {this.state.contacts && Array.from(this.state.contacts).map((contact, idx) =>
                      <tr>
                        <td className="text-center">
                          <div className="avatar">
                            <img src={`assets/img/avatars/${idx + 1}.jpg`} className="img-avatar" alt="admin@bootstrapmaster.com" />
                            <span className="avatar-status badge-success"></span>
                          </div>
                        </td>
                        <td>
                          <div>{contact.entity_id}</div>
                          {/* <div className="small text-muted">
                            <span>New</span> | Registered: Jan 1, 2015 */}
                          {/* </div> */}
                        </td>
                        <td>
                          <div className="clearfix">
                            <div className="float-left">
                              <strong>{contact.distance}km</strong>
                            </div>
                            {/* <div className="float-right">
                              <small className="text-muted">Jun 11, 2015 - Jul 10, 2015</small>
                            </div> */}
                          </div>
                          <Progress animated className="mb-3" color={(Number.parseFloat(contact.distance) / 6.0) > 0.75 ? "warning" : "success"} value={100 * (Number.parseFloat(contact.distance) / 6.0)} />
                        </td>
                      </tr>
                    )}
                    {/* <tr>
                      <td className="text-center">
                        <div className="avatar">
                          <img src={'assets/img/avatars/1.jpg'} className="img-avatar" alt="admin@bootstrapmaster.com" />
                          <span className="avatar-status badge-success"></span>
                        </div>
                      </td>
                      <td>
                        <div>Yiorgos Avraamu</div>
                        <div className="small text-muted">
                          <span>New</span> | Registered: Jan 1, 2015
                      </div>
                      </td>
                      <td>
                        <div className="clearfix">
                          <div className="float-left">
                            <strong>50km</strong>
                          </div>
                        </div>
                        <Progress animated className="mb-3" color="success" value="50" />
                      </td>
                    </tr>
                    <tr>
                      <td className="text-center">
                        <div className="avatar">
                          <img src={'assets/img/avatars/2.jpg'} className="img-avatar" alt="admin@bootstrapmaster.com" />
                          <span className="avatar-status badge-danger"></span>
                        </div>
                      </td>
                      <td>
                        <div>Avram Tarasios</div>
                        <div className="small text-muted">

                          <span>Recurring</span> | Registered: Jan 1, 2015
                      </div>
                      </td>
                      <td>
                        <div className="clearfix">
                          <div className="float-left">
                            <strong>10km</strong>
                          </div>
                        </div>
                        <Progress animated color="success" value="75" className="mb-3" />
                      </td>
                    </tr>
                    <tr>
                      <td className="text-center">
                        <div className="avatar">
                          <img src={'assets/img/avatars/3.jpg'} className="img-avatar" alt="admin@bootstrapmaster.com" />
                          <span className="avatar-status badge-warning"></span>
                        </div>
                      </td>
                      <td>
                        <div>Quintin Ed</div>
                        <div className="small text-muted">
                          <span>New</span> | Registered: Jan 1, 2015
                      </div>
                      </td>
                      <td>
                        <div className="clearfix">
                          <div className="float-left">
                            <strong>74km</strong>
                          </div>
                        </div>
                        <Progress animated className="mb-3" color="warning" value="74" />
                      </td>
                    </tr>
                    <tr>
                      <td className="text-center">
                        <div className="avatar">
                          <img src={'assets/img/avatars/4.jpg'} className="img-avatar" alt="admin@bootstrapmaster.com" />
                          <span className="avatar-status badge-secondary"></span>
                        </div>
                      </td>
                      <td>
                        <div>Enéas Kwadwo</div>
                        <div className="small text-muted">
                          <span>New</span> | Registered: Jan 1, 2015
                      </div>
                      </td>
                      <td>
                        <div className="clearfix">
                          <div className="float-left">
                            <strong>98km</strong>
                          </div>
                        </div>
                        <Progress animated className="mb-3" color="danger" value="98" />
                      </td>
                    </tr>
                    <tr>
                      <td className="text-center">
                        <div className="avatar">
                          <img src={'assets/img/avatars/5.jpg'} className="img-avatar" alt="admin@bootstrapmaster.com" />
                          <span className="avatar-status badge-success"></span>
                        </div>
                      </td>
                      <td>
                        <div>Agapetus Tadeáš</div>
                        <div className="small text-muted">
                          <span>New</span> | Registered: Jan 1, 2015
                      </div>
                      </td>
                      <td>
                        <div className="clearfix">
                          <div className="float-left">
                            <strong>22km</strong>
                          </div>
                        </div>
                        <Progress animated className="mb-3" color="info" value="22" />
                      </td>
                    </tr>
                    <tr>
                      <td className="text-center">
                        <div className="avatar">
                          <img src={'assets/img/avatars/6.jpg'} className="img-avatar" alt="admin@bootstrapmaster.com" />
                          <span className="avatar-status badge-danger"></span>
                        </div>
                      </td>
                      <td>
                        <div>Friderik Dávid</div>
                        <div className="small text-muted">
                          <span>New</span> | Registered: Jan 1, 2015
                      </div>
                      </td>
                      <td>
                        <div className="clearfix">
                          <div className="float-left">
                            <strong>43km</strong>
                          </div>
                        </div>
                        <Progress animated className="mb-3" color="success" value="43" />
                      </td>
                    </tr> */}
                  </tbody>
                </Table>

                {/* END CONTACTS TABLE */}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}

export default Stacktrader;
