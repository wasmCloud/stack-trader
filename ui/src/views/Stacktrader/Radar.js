import React, { Component } from 'react';

class Radar extends Component {

    constructor(props) {
        super(props)

        this.state = {
            contacts: [],
            radarReceiver: {},
        }
    }

    componentDidMount() {
        this.getContacts()
    }

    getContacts = () => {
        this.props.client.get(`decs.components.${this.props.shard}.${this.props.entity}.radar_contacts`).then(contacts => {
            contacts.on('add', this.onUpdate)
            contacts.on('remove', this.onUpdate)
            this.setState({ contacts })
        }).catch(err => {
            setTimeout(() => this.getContacts(), 500)
        })

        this.props.client.get(`decs.components.${this.props.shard}.${this.props.entity}.radar_receiver`).then(radarReceiver => {
            this.setState({ radarReceiver })
        })
    }

    computeVelocity = (event) => {
        let x = event.offsetX - 150
        let y = 150 - event.offsetY

        if (event.target instanceof HTMLDivElement) {
            //TODO: Velocity does not scale correctly for radar circle
            let rads = Math.atan(y / x)
            let distance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / 150
            let ux = Math.cos(rads) * distance
            let uy = Math.sin(rads) * distance

            if (x <= 0) {
                ux *= -1
                uy *= -1
            }

            console.log(x)
            console.log(y)
            console.log(ux)
            console.log(uy)

            let velocity = {
                mag: 900,
                ux,
                uy,
                uz: 0.0
            }

            this.props.client.call(`decs.components.${this.props.shard}.${this.props.entity}.target`, 'delete').then(r => {
                this.props.navigateToTarget('delete')
            })
        }
    }

    navigateToContact = (_event, contact) => {
        // this.props.client.call(`decs.components.${this.props.shard}.${this.props.entity}.velocity`, 'set', velocity)
        this.props.navigateToTarget(`decs.components.${this.props.shard}.${contact.entity_id}`)
    }

    render() {
        let radar_receiver_radius = this.state.radarReceiver ? this.state.radarReceiver.radius : 1;
        let time = 5
        let radar_radius = 150;
        let dots = Array.from(this.state.contacts).map(contact => {
            let rad = (contact.azimuth) * Math.PI / 180 * -1,
                xOffset = contact.distance_xy * Math.cos(rad),
                yOffset = contact.distance_xy * Math.sin(rad),
                x = radar_radius + (xOffset * radar_radius / radar_receiver_radius),
                y = radar_radius + (yOffset * radar_radius / radar_receiver_radius),
                delay = time / 360 * contact.azimuth;
            let style = {
                left: x,
                top: y,
                color: contact.transponder.color,
                '-webkit-animation-delay': delay + 's',
                'animation-delay': delay + 's'
            }
            let icon = contact.transponder.object_type === "asteroid" ? "fa-bullseye" :
                contact.transponder.object_type === "ship" ? "fa-space-shuttle" :
                    contact.transponder.object_type === "starbase" ? "fa-fort-awesome" : "fa-warning"
            return <span style={style} className={`dot radar-icon fa ${icon} fa-lg`} onClick={(e) => this.navigateToContact(e, contact)}></span>
        })
        return (
            <div id="radar-container">
                <div id="radar" className="animated">
                    <i style={{ pointerEvents: 'none' }} className="player-rocket radar-icon icon-rocket icons font-2xl"><i></i></i>
                    <div id="guides" onClick={(e) => this.computeVelocity(e.nativeEvent)}>
                        <div className="circle" style={{ pointerEvents: 'none' }}></div>
                        {dots}
                    </div>
                </div>
            </div>
        )
    }
}

export default Radar;