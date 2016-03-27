// var _ = require('lodash'),
//     Inventory = require('Inventory');

var PartCosts = {};
    PartCosts[MOVE] = 50;
    PartCosts[WORK] = 100;
    PartCosts[CARRY] = 50;
    PartCosts[ATTACK] = 80;
    PartCosts[RANGED_ATTACK] = 150;
    PartCosts[HEAL] = 250;
    PartCosts[TOUGH] = 10;

declare var module: any;
(module).exports = {
    USERNAME: 'ShiXish',
    MIN_TICKS_TO_LIVE: 500,
    MAX_UNITS_METRIC: 3,
    MAX_HITS_REPAIR: 1000000,
    MAX_COST: 3000,
    PART_COSTS: PartCosts,
}
