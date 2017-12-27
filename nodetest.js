
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