import React, { Component } from 'react';
import {
    Row,
} from 'reactstrap';

export const StackTypes = {
    TASTY: 'tasty',
    SPENDY: 'spendy',
    CRITICAL: 'critical'
}

class Inventory extends Component {

    constructor(props) {
        super(props)

        this.state = {
            sell_list: [],
        }
    }

    sellStack = (type) => {

        let toSell = []
        for (let i = 0; i < this.props.inventory.length; i++) {
            let item = this.props.inventory[i]
            if (item.stack_type === type) {
                toSell.push(item)
            }
        }

        for (let i = 0; i < toSell.length; i++) {
            this.props.sellItem(toSell[i])
        }
    }

    render() {
        let tastyCount = 0;
        let spendyCount = 0;
        let criticalCount = 0;
        for (let i = 0; i < this.props.inventory.length; i++) {
            let item = this.props.inventory[i]
            switch (item.stack_type) {
                case StackTypes.TASTY:
                    tastyCount += item.qty;
                    break;
                case StackTypes.SPENDY:
                    spendyCount += item.qty;
                    break;
                case StackTypes.CRITICAL:
                    criticalCount += item.qty;
                    break;
                default:
                    break;
            }
        }

        let rowStyle = { marginRight: '0px', marginLeft: '0px' }
        let noInteractIcon = <i className="cui-dollar icons font-2xl d-block ml-1" style={{ color: 'black', opacity: '0.5' }}></i>

        return (
            <div>
                <Row style={rowStyle}>
                    <strong>{!this.props.wallet ? 0 : this.props.wallet.credits} Credits</strong>
                </Row>
                {tastyCount > 0 && <Row style={rowStyle}>
                    {`${tastyCount} ${StackTypes.TASTY} stacks`}
                    {this.props.withinStarbaseRange() ?
                        <i onClick={() => this.sellStack(StackTypes.TASTY)} className="cui-dollar icons font-2xl d-block ml-1" style={{ cursor: 'pointer', color: `${this.props.isSelling ? 'green' : 'black'}` }}></i>
                        : noInteractIcon}
                </Row>}
                {spendyCount > 0 && <Row style={rowStyle}>
                    {`${spendyCount} ${StackTypes.SPENDY} stacks`}
                    {this.props.withinStarbaseRange() ?
                        <i onClick={() => this.sellStack(StackTypes.SPENDY)} className="cui-dollar icons font-2xl d-block ml-1" style={{ cursor: 'pointer', color: `${this.props.isSelling ? 'green' : 'black'}` }}></i>
                        : noInteractIcon}
                </Row>}
                {criticalCount > 0 && <Row style={rowStyle}>
                    {`${criticalCount} ${StackTypes.CRITICAL} stacks`}
                    {this.props.withinStarbaseRange() ?
                        <i onClick={() => this.sellStack(StackTypes.CRITICAL)} className="cui-dollar icons font-2xl d-block ml-1" style={{ cursor: 'pointer', color: `${this.props.isSelling ? 'green' : 'black'}` }}></i>
                        : noInteractIcon}
                </Row>}
            </div>)
    }

}

export default Inventory;