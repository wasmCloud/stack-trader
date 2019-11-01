import React, { Component } from 'react';
import {
    Row,
} from 'reactstrap';

const StackTypes = {
    TASTY: 'tasty',
    SPENDY: 'spendy',
    CRITICAL: 'critical'
}

class Inventory extends Component {

    constructor(props) {
        super(props)
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
            }
        }
        return (
            <div>
                {tastyCount > 0 && <Row style={{ marginRight: '0px', marginLeft: '0px' }}>
                    {`${tastyCount} ${StackTypes.TASTY} stacks`}
                </Row>}
                {spendyCount > 0 && <Row style={{ marginRight: '0px', marginLeft: '0px' }}>
                    {`${spendyCount} ${StackTypes.SPENDY} stacks`}
                </Row>}
                {criticalCount > 0 && <Row style={{ marginRight: '0px', marginLeft: '0px' }}>
                    {`${criticalCount} ${StackTypes.CRITICAL} stacks`}
                </Row>}
            </div>)
    }

}

export default Inventory;