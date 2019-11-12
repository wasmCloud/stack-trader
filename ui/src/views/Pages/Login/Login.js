import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardGroup, Col, Container, Form, Input, InputGroup, InputGroupAddon, InputGroupText, Row } from 'reactstrap';
import { Redirect } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import ResClient from 'resclient';
import 'react-toastify/dist/ReactToastify.css';
import CryptoJS from 'crypto-js'

import Secret from '../../../secret/secret-key.json'

class Login extends Component {

  constructor(props) {
    super(props)

    this.state = {
      username: "",
      password: "",
      loggedIn: false
    }
  }

  login = (e) => {
    e.preventDefault()
    let client = new ResClient('/resgate')
    client.get(`decs.user.${this.state.username}`).then(user => {
      if (this.state.password === CryptoJS.AES.decrypt(user.pass, Secret.secret).toString(CryptoJS.enc.Utf8)) {
        this.setState({ loggedIn: true })
      } else {
        toast.error("Incorrect username or password")
      }
    }).catch(err => {
      toast.error("Incorrect username or password")
    })
  }

  redirectToGame = () => {
    if (this.state.loggedIn) {
      return <Redirect to={{
        pathname: `/stacktrader`,
        username: this.state.username,
        shard: "mainworld",
        from: "login"
      }} from='/login' />
    }
  }

  render() {
    return (
      <div className="app flex-row align-items-center">
        {this.redirectToGame()}
        <ToastContainer position="top-right" autoClose={5000} style={{ zIndex: 1999 }} />
        <Container>
          <Row className="justify-content-center">
            <Col md="8">
              <CardGroup>
                <Card className="p-4">
                  <CardBody>
                    <Form onSubmit={this.login}>
                      <h1>Login</h1>
                      <p className="text-muted">Sign In to your account</p>
                      <InputGroup className="mb-3">
                        <InputGroupAddon addonType="prepend">
                          <InputGroupText>
                            <i className="icon-user"></i>
                          </InputGroupText>
                        </InputGroupAddon>
                        <Input type="text" placeholder="Username" autoComplete="username" value={this.state.username} onChange={(e) => this.setState({ username: e.target.value })} />
                      </InputGroup>
                      <InputGroup className="mb-4">
                        <InputGroupAddon addonType="prepend">
                          <InputGroupText>
                            <i className="icon-lock"></i>
                          </InputGroupText>
                        </InputGroupAddon>
                        <Input type="password" placeholder="Password" autoComplete="current-password" value={this.state.password} onChange={(e) => this.setState({ password: e.target.value })} />
                      </InputGroup>
                      <Row>
                        <Col xs="6">
                          <Button color="primary" className="px-4" onClick={this.login}>Login</Button>
                        </Col>
                      </Row>
                    </Form>
                  </CardBody>
                </Card>
                <Card className="text-white bg-primary py-5">
                  <CardBody className="text-center">
                    <div>
                      <h2>Sign up</h2>
                      <p>Create a StackTrader account and play today!</p>
                      <Link to="/register">
                        <Button color="primary" className="mt-3" active tabIndex={-1}>Register Now!</Button>
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              </CardGroup>
            </Col>
          </Row>
        </Container>
      </div >
    );
  }
}

export default Login;
