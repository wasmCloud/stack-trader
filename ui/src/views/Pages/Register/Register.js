import React, { Component } from 'react';
import { Button, Card, CardBody, Col, Container, Form, Input, InputGroup, InputGroupAddon, InputGroupText, Row } from 'reactstrap';
import { Redirect } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import ResClient from 'resclient';
import 'react-toastify/dist/ReactToastify.css';
import CryptoJS from 'crypto-js'

import Secret from '../../../secret/secret-key.json'

class Register extends Component {

  constructor(props) {
    super(props)

    this.state = {
      username: "",
      email: "",
      password: "",
      repeatPassword: "",
      loggedIn: false
    }
  }

  signup = (e) => {
    e.preventDefault()
    let client = new ResClient('/resgate')
    if (this.state.username.includes(" ")) {
      toast.error("Username cannot contain spaces")
      return
    }
    if (this.state.password !== this.state.repeatPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (this.state.username === "" || this.state.password === "" || this.state.email === "" || this.state.repeatPassword === "") {
      toast.error("No fields can be left blank")
      return
    }
    // Here need to ensure that we are not creating over a previous user, and then create the user
    client.get(`decs.user.${this.state.username}`).then(_user => {
      toast.error("Username already exists, try logging in instead")
    }).catch(_err => {
      let user = {
        email: this.state.email,
        pass: CryptoJS.AES.encrypt(this.state.password, Secret.secret).toString(),
        id: this.state.username
      }
      client.call(`decs.users`, 'add', user).then(_res => {
        this.setState({ loggedIn: true })
      })
    })
  }

  redirectToGame = () => {
    if (this.state.loggedIn) {
      return <Redirect to={{
        pathname: `/stacktrader`,
        username: this.state.username,
        shard: "mainworld",
        from: "register"
      }} from='/register' />
    }
  }

  render() {
    return (
      <div className="app flex-row align-items-center">
        {this.redirectToGame()}
        <ToastContainer position="top-right" autoClose={5000} style={{ zIndex: 1999 }} />
        <Container>
          <Row className="justify-content-center">
            <Col md="9" lg="7" xl="6">
              <Card className="mx-4">
                <CardBody className="p-4">
                  <Form onSubmit={this.signup}>
                    <h1>Register</h1>
                    <p className="text-muted">Keep in mind, your username may displayed on large TVs at the vendor booth. Please choose something appropriate for display.</p>
                    <InputGroup className="mb-3">
                      <InputGroupAddon addonType="prepend">
                        <InputGroupText>
                          <i className="icon-user"></i>
                        </InputGroupText>
                      </InputGroupAddon>
                      <Input type="text" placeholder="Username" autoComplete="username" maxLength={32} value={this.state.username} onChange={(e) => this.setState({ username: e.target.value })} />
                    </InputGroup>
                    <InputGroup className="mb-3">
                      <InputGroupAddon addonType="prepend">
                        <InputGroupText>@</InputGroupText>
                      </InputGroupAddon>
                      <Input type="text" placeholder="Email" autoComplete="email" value={this.state.email} onChange={(e) => this.setState({ email: e.target.value })} />
                    </InputGroup>
                    <InputGroup className="mb-3">
                      <InputGroupAddon addonType="prepend">
                        <InputGroupText>
                          <i className="icon-lock"></i>
                        </InputGroupText>
                      </InputGroupAddon>
                      <Input type="password" placeholder="Password" autoComplete="new-password" value={this.state.password} onChange={(e) => this.setState({ password: e.target.value })} />
                    </InputGroup>
                    <InputGroup className="mb-4">
                      <InputGroupAddon addonType="prepend">
                        <InputGroupText>
                          <i className="icon-lock"></i>
                        </InputGroupText>
                      </InputGroupAddon>
                      <Input type="password" placeholder="Repeat password" autoComplete="new-password" value={this.state.repeatPassword} onChange={(e) => this.setState({ repeatPassword: e.target.value })} />
                    </InputGroup>
                    <Button color="success" block onClick={this.signup}>Create Account</Button>
                  </Form>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

export default Register;
