function calculateTax(amount, rate) {
    let result = amount * rate;
    return result;
}

function calculateTotal(price, taxRate) {
    // SET BREAKPOINT ON THE LINE BELOW
    let tax = calculateTax(price, taxRate); 
    let total = price + tax;
    return total;
}

// We have to actually call the function to make it run!
let finalAmount = calculateTotal(100, 0.05);
console.log(finalAmount);