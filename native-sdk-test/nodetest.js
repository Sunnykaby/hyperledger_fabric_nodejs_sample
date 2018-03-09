
console.log("continue doing");

Promise.resolve().then(() =>{
    var test = [];
    return Promise.all(test).then((status) =>{
        var i = 100;
        var sum = 1;
        while(i>0){sum = sum * i;i--;}
        console.log("do nothing" + sum);
    });
});

Promise.resolve().then(() =>{
    var test = [];
    return Promise.all(test).then((status) =>{
        console.log("do nothing2" + " :" + status.length);
    });
});

console.log("End")

var objs = {url1:{url:"1",ops:"1"},url2:{url:"2",ops:"2"}};

console.log(objs["name"]);

var list = [{url:"1",ops:"1"},{url:"2",ops:"2"}]
var count = 0;
list.forEach((obj)=>{
    console.log(obj);
    count += 1;
})

console.log(count)

for(var temp in objs){
    list.push(objs[temp])
}

console.log(list)

var das = new Date();
console.log(das)
console.log(das.toUTCString())
console.log(das.toLocaleTimeString())
// console.log(das.format('yyyy-MM-ddTHH:mm:ss'))