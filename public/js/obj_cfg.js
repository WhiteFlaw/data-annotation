// size is the dimension of the object in x/y/z axis, with unit meter.

class ObjectCategory
{


    obj_type_map = {
        Car:            {color: '#86af49',  size:[4.5, 1.8, 1.5], attr:["door open", "trunk open"]},
        Pedestrian:     {color: '#ff0000',  size:[0.4, 0.5, 1.7], attr:["umbrella", "sitting", "squating", "bending over", "luggage"]},
        Van:            {color: '#00ff00',  size:[4.5, 1.8, 1.5], attr:["door open", "trunk open"]},
        Bus:            {color: '#ffff00',  size:[13, 3, 3.5]},
        Truck:          {color: '#00ffff',  size:[10., 2.8, 3]},
        
        ScooterRider:   {color: '#ff8800',  size:[1.6, 0.6, 1.6], attr:["umbrella", "1 passenger", "2 passengers", "3 passengers"]},
        Scooter:        {color: '#aaaa00',  size:[1.6, 0.6, 1.0]},

        
        BicycleRider:   {color: '#88ff00',  size:[1.6, 0.6, 1.7], attr:["umbrella", "1 passenger", "2 passengers", "3 passengers"]},
        Bicycle:        {color: '#ff8800',  size:[1.6, 0.6, 1.2], attr:["laying down"]},


        Motorcycle:     {color: '#aaaa00',  size:[1.6, 0.6, 1.2], attr:["umbrella"]},
        MotorcyleRider: {color: '#ff8800',  size:[1.6, 0.6, 1.6], attr:["umbrella", "1 passenger", "2 passengers", "3 passengers"]},

        

        PoliceCar:      {color: '#86af49',  size:[4.5, 1.8, 1.5]},
        TourCar:        {color: '#86af49',  size:[4.4, 1.5, 2.2]},

        RoadWorker:     {color: '#ff0000',  size:[0.4, 0.5, 1.7]},
        Child:          {color: '#ff0000',  size:[0.4, 0.5, 1.2]},

        //Crowd:          {color: '#ff0000',  size:[1.6, 0.6, 1.2]},

        BabyCart:       {color: '#ff0000',  size:[0.8, 0.5, 1.0]},
        Cart:           {color: '#ff0000',  size:[0.8, 0.5, 1.0]},
        Cone:           {color: '#ff0000',  size:[0.3, 0.3, 0.6]},
        FireHydrant:    {color: '#ff0000',  size:[0.4, 0.4, 0.6]},
        SaftyTriangle:  {color: '#ff0000',  size:[0.3, 0.4, 0.4]},
        PlatformCart:   {color: '#ff0000',  size:[1.2, 0.8, 1.0]},
        ConstructionCart: {color: '#ff0000',  size:[1.2, 0.8, 1.0]},
        RoadBarrel:     {color: '#ff0000',  size:[0.5, 0.5, 0.6]},
        TrafficBarrier: {color: '#ff0000',  size:[1.5, 0.3, 1.2]},
        LongVehicle:    {color: '#ff0000',  size:[16, 3, 3]},

        
        BicycleGroup:   {color: '#ff0000',  size:[1.6, 0.6, 1.2]},
        

        ConcreteTruck:  {color: '#00ffff',  size:[10., 2.8, 3]},
        Tram:           {color: '#00ffff',  size:[10., 2.8, 3]},
        Excavator:      {color: '#00ffff',  size:[6., 3, 3]},

        Animal:         {color: '#00aaff',  size:[1.6, 0.6, 1.2]},

        TrashCan:         {color: '#00aaff',  size:[0.6, 0.4, 1.0]},

        ForkLift:       {color: '#00aaff',  size:[5.0, 1.2, 2.0]},
        Trimotorcycle:  {color: '#00aaff',  size:[2.6, 1.0, 1.6]},
        FreightTricycle: {color: '#00aaff',  size:[2.6, 1.0, 1.6]},
        Crane:          {color: '#00aaff',  size:[5.0, 1.2, 2.0]},
        RoadRoller:     {color: '#00aaff',  size:[2.7, 1.5, 2.0]},
        Bulldozer:      {color: '#00aaff',  size:[3.0, 2.0, 2.0]},

        DontCare:       {color: '#00ff88',  size:[4, 4, 3]},
        Misc:           {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown:        {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown1:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown2:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown3:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown4:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
        Unknown5:       {color: '#008888',  size:[4.5, 1.8, 1.5]},
    };


    constructor(){
        
    }

    popularCategories = ["Car", "Pedestrian", "Van", "Bus", "Truck", "Scooter", "ScooterRider", "Bicycle", "BicycleRider"];

    guess_obj_type_by_dimension(scale){

        var max_score = 0;
        var max_name = 0;
        this.popularCategories.forEach(i=>{
            var o = this.obj_type_map[i];
            var scorex = o.size[0]/scale.x;
            var scorey = o.size[1]/scale.y;
            var scorez = o.size[2]/scale.z;

            if (scorex>1) scorex = 1/scorex;
            if (scorey>1) scorey = 1/scorey;
            if (scorez>1) scorez = 1/scorez;

            if (scorex + scorey + scorez > max_score){
                max_score = scorex + scorey + scorez;
                max_name = i;
            }
        });

        console.log("guess type", max_name);
        return max_name;
    }

    global_color_idx = 0;
    get_color_by_id(id){
        let idx = parseInt(id);

        if (!idx)
        {
            idx = this.global_color_idx;
            this.global_color_idx += 1;
        }

        idx %= 33;
        idx = idx*19 % 33;

        return {
            x: idx*8/256.0,
            y: 1- idx*8/256.0,
            z: (idx<16)?(idx*2*8/256.0):((32-idx)*2*8/256.0),
        };
    }

    get_color_by_category(category){
        let target_color_hex = parseInt("0x"+this.get_obj_cfg_by_type(category).color.slice(1));
        
        return {
            x: (target_color_hex/256/256)/255.0,
            y: (target_color_hex/256 % 256)/255.0,
            z: (target_color_hex % 256)/255.0,
        };
    }

    get_obj_cfg_by_type(name){
        if (this.obj_type_map[name]){
            return this.obj_type_map[name];
        }
        else{
            return this.obj_type_map["Unknown"];
        }
    }

    // name_array = []

    // build_name_array(){
    //     for (var n in this.obj_type_map){
    //         name_array.push(n);
    //     }
    // }


    // get_next_obj_type_name(name){

    //     if (name_array.length == 0)    {
    //         build_name_array();
    //     }

    //     var idx = name_array.findIndex(function(n){return n==name;})
    //     idx+=1;
    //     idx %= name_array.length;

    //     return name_array[idx];
    // }

}


let globalObjectCategory = new ObjectCategory();

export {globalObjectCategory};