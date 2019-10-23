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
            return <span style={style} className={`dot radar-icon fa ${icon} fa-lg`}></span>
        })
        return (
            <div id="radar-container">
                <div id="radar" className="animated">
                    <i className="player-rocket radar-icon icon-rocket icons font-2xl"><i></i></i>
                    <div id="guides">
                        <div className="circle"></div>
                        {dots}
                    </div>
                </div>
            </div>
        )
    }
}

export default Radar;