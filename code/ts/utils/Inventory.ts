/// <reference path="../vars/Globals.ts" />
/// <reference path="../vars/CreepInfo.ts" />
/// <reference path="../utils/Debug.ts" />
"use strict";

class Inventory {
    // static flush() {
    //     for (let r in Game.rooms) {
    //         let room = Game.rooms[r];
    //         room.memory['energy'] = room.memory['energyCapacity'] = 0;

    //         Inventory.invRoomSources(room);
    //         Inventory.invRoomMinerals(room);
    //         Inventory.invRoomStructures(room);


    //         // FIND_CONSTRUCTION_SITES
    //     }
    //     Inventory.invCreeps();
    // }
    static update() {
        var invDiag = debug.diag('Inventory');
        //garbage collect flags
        for (let f in Memory.flags){
            if (!Game.flags[f]) {
                delete Memory.flags[f];
            } else if (Memory.flags[f].creeps) {
                for (let c in Memory.flags[f].creeps){
                    if (!Game.creeps[Memory.flags[f].creeps[c]]){
                        // delete Memory.flags[f].creeps[c]
                        Memory.flags[f].creeps.splice(c, 1);
                    }
                }
            }
        }

        for (let r in Game.rooms) {
            let room = Game.rooms[r];
            // room.memory['energy'] = room.memory['energyCapacity'] = 0;
            delete room.memory['creep_roles']; //needs to be rebuilt.

            if (!room.memory.source) Inventory.invRoomSources(room);
            if (!room.memory.mineral) Inventory.invRoomMinerals(room);

            Inventory.invRoomStructures(room);
            Inventory.updateSpawnQueue(room);

            let hostile_creeps = room.find(FIND_HOSTILE_CREEPS);
            // console.log(hostile_creeps);
            room.memory.under_attack = hostile_creeps.length;
        }
        Inventory.invCreeps();
        invDiag.stop();
    }

    static teardown() { 
        for (let r in Game.rooms) {
            let room = Game.rooms[r];
            delete room.memory['creep_roles']; //should be rebuilt each tick
        }
    }


    static invRoomSources(room:Room) {
        let sources = <Source[]>room.find(FIND_SOURCES);
        if (!room.memory['source']) room.memory['source'] = {};
        for (let s in sources) {
            let source = sources[s];
            if (!room.memory['source'][source.id])
                room.memory['source'][source.id] = {};
        }
    }
    static room_sources(room: Room): number {
        if (room.memory['source'])
            return Object.keys(room.memory['source']).length;
        else
            return 0;
    }

    static invRoomMinerals(room: Room) {
        let minerals = <Mineral[]>room.find(FIND_MINERALS);
        if (!room.memory['mineral']) room.memory['mineral'] = {};
        for (let s in minerals) {
            let mineral = minerals[s];
            if (!room.memory['mineral'][mineral.id])
                room.memory['mineral'][mineral.id] = {};
        }
    }
    static room_minerals(room: Room): number {
        if (room.memory['mineral'])
            return Object.keys(room.memory['mineral']).length;
        else
            return 0;
    }

    static invRoomStructures(room: Room) {
        let structures = <Structure[]>room.find(FIND_STRUCTURES);
        // room.memory.structures = {};
        let by_type = {};
        for (let s in structures) {
            let structure = structures[s];
            if (!by_type[structure.structureType]) by_type[structure.structureType] = [];
            by_type[structure.structureType].push(structure.id);
            // if (!by_type[structure.structureType][structure.id]) by_type[structure.structureType][structure.id] = {};

            // console.log(structure.structureType);

            // if (structure.structureType == 'spawn' || structure.structureType == 'extension') {
            //     room.memory['energy'] += (<Spawn>structure).energy;
            //     room.memory['energyCapacity'] += (<Spawn>structure).energyCapacity;
            // }
        }
        room.memory.structures = by_type;
    }
    static room_structure_count(type: string, room: Room): number {
        if (room.memory['structures'] && room.memory['structures'][type])
            return room.memory['structures'][type].length;
        else
            return 0;
    }

    static invCreeps() {
        // if (!Memory['creep_roles']) Memory['creep_roles'] = {};

        //Clear out the old memory:
        for (let name in Memory.creeps) {
            // Game.getObjectById()
            if (!Game.creeps[name]) {
                console.log('Deleting ' + Memory.creeps[name].role + " creep " + name + " from memory.");
                // if (Memory['creep_roles'][Memory.creeps[name].role] && Memory['creep_roles'][Memory.creeps[name].role][name])
                //     delete Memory['creep_roles'][Memory.creeps[name].role][name];
                delete Memory['creeps'][name];
            }
        }

        for (let c in Game.creeps) {
            // console.log(c);
            let creep = <Creep>Game.creeps[c];
            // let role = creep.memory.role,
            //     name = creep.name;
            // if (!Memory['creep_roles'][role]) Memory['creep_roles'][role] = {};
            // Memory['creep_roles'][role][name] = {};
            Inventory.invCreepObj(creep);
        }
    }
    static room_creep_count(role: string, room: Room): number {
        if (room.memory['creep_roles'] && room.memory['creep_roles'][role])
            return room.memory['creep_roles'][role].length;
        else
            return 0;
    }

    // static invCreep(creep:Creep) {
    //     if (typeof role == "object") {
    //         name = role.name;
    //         role = <Creep>role.memory.role;
    //     }

    //     if (!Memory['creep_roles'][role]) Memory['creep_roles'][role] = {}
    //     Memory['creep_roles'][role][name] = {};
    // }

    // static invCreep(role: any, name?: string) {
    //     // let role: string, name: string;
    //     if (typeof(role) == "object") {
    //         name = (<Creep>role).name;
    //         role = (<Creep>role).memory.role;
    //     }

    //     if (!Memory['creep_roles'][role]) Memory['creep_roles'][role] = {}
    //     Memory['creep_roles'][role][name] = {};
    //     this.creep_cache[]
    // }

    //Shouldn't really be necessary anymore:
    static calculateCreepCost(creep) {
        return _.reduce(_.map(creep.body, (obj) => { return obj.type; }), (a, b) => { return a + BODYPART_COST[b] }, 0);
    }

    static updateSpawnQueue(room: Room){
        let sources = Inventory.room_sources(room),
            minerals = Inventory.room_minerals(room),
            spawns = Inventory.room_structure_count('spawn', room),
            storage = Inventory.room_structure_count('storage', room),
            towers = Inventory.room_structure_count('tower', room),
            links = Inventory.room_structure_count('link', room),
            extensions = Inventory.room_structure_count('extension', room);

        // console.log(flagCreeps['runner'])
        let max_creeps = {
            'builder': (room.controller.level < 8 ? 1 : 0) + (storage ? 1 : 0),
            'harvester': sources,
            'linker': links > 0 ? storage : 0,
            'courier': storage > 0 ? Math.ceil(towers / 2) : 0,
            'miner': 0, //storage > 0 ? minerals : 0,
            'guard': 0,
            'ranger': 0,
            'runner': 0,
            'healer': 0,
        }

        let current_creeps = {};
        for (let role in max_creeps) {
            current_creeps[role] = Inventory.room_creep_count(role, room);
        }

        let under_attack_by = room.memory.under_attack;
        if (room.memory.under_attack > 0){
            max_creeps.courier += Math.floor(under_attack_by / 3);
            max_creeps.healer += Math.floor(under_attack_by / 2);
            max_creeps.guard += Math.ceil(under_attack_by / 4);
            max_creeps.ranger += Math.ceil(under_attack_by);
        }
        
        let queue = [];
        for (let role in max_creeps) {
            let count = Inventory.room_creep_count(role, room);
            if (current_creeps[role] < max_creeps[role]) {
                queue.push(role);
                current_creeps[role]++;
            }else if (current_creeps[role] > max_creeps[role]){
                //should obsolete some existing creeps...
            }
        }

        room.memory['SpawnQueue'] = queue;
        room.memory['MaxCreeps'] = max_creeps;
    }

    static invCreepObj(creep: Creep) {
        // console.log(creep);
        let role: string = creep.memory.role,
            name: string = creep.name,
            home: string = creep.memory.home;

        if (!creep.memory.home) home = creep.memory.home = creep.room.name;
        
        let room: Room = Game.rooms[home];
        this.invCreep(role, name, room);

        // //This should only be temporarily necessary:
        // if (!creep.memory.cost) {
        //     // console.log(_.map(creep.body, (obj) => { return obj.type; }));
        //     creep.memory.cost = this.calculateCreepCost(creep);
        // }
        if (!creep.memory.obsolete) { //room.controller.level < 8 && 
            let ctrl = creep_controllers[role];
            if (ctrl) {
                if (ctrl.creep_is_obsolete(creep, room) === true) {
                    creep.memory.obsolete = true;
                    console.log(`Detected obsolete ${creep.memory.role} creep named ${name} in room ${room.name}`);
                }
            } else {
                console.log(`Inventory unable to find creep controller for ${creep}`);
            }
        }
    }

    static invCreep(role: string, name: string, room: Room) {
        if (!room.memory['creep_roles']) room.memory['creep_roles'] = {};
        if (!room.memory['creep_roles'][role]) room.memory['creep_roles'][role] = [];
        room.memory['creep_roles'][role].push(name);
    }

    static invNewCreep(role: string, name: string, room: Room) {
        this.invCreep(role, name, room);
        // currently used by (role == "ranger" || role == "guard" || role == "runner") :
        let flag_name = `${room.name}_${role}`;
        if (Game.flags[flag_name]) {
            if (!Game.flags[flag_name].memory.creeps) Game.flags[flag_name].memory.creeps = [];
            Game.flags[flag_name].memory.creeps.push(name);
        }
    }


    // static creeps_by_role(role) {
    //     if (Memory['creep_roles'] && Memory['creep_roles'][role])
    //         return Object.keys(Memory['creep_roles'][role]);
    // }

    // static creeps_role_count(role):number {
    //     if (Memory['creep_roles'] && Memory['creep_roles'][role])
    //         return Object.keys(Memory['creep_roles'][role]).length;
    //     else
    //         return 0;
    // }

    // static creep_weights() {
    //     return {
    //         worker: (1 + Inventory.creeps_role_count('worker')),
    //         guard: (1 + Inventory.creeps_role_count('guard')) * 2
    //     };
    // }

    // static creep_should_build() {
    //     let weights = Inventory.creep_weights();
    //     let build_value, build_role;
    //     for (let i in weights) {
    //         let value = weights[i];
    //         if (build_value == undefined || value < build_value) {
    //             build_value = value;
    //             build_role = i;
    //         }
    //     }
    //     if (build_value <= Globals.MAX_UNITS_METRIC)
    //         return build_role;
    // }
}