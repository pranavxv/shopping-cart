
function addToCart(proId){
    $.ajax({
        url:'/add-to-cart/'+proId,
        method:'get',
        success:(response)=>{
            if(response.status){
                if(proId!=proId){
                let count = $('#cart-count').html()
                count= parseInt(count)+1
                $('#cart-count').html(count)
                }else{
                    location.reload()
                }
                
            }
        }
    })
}
