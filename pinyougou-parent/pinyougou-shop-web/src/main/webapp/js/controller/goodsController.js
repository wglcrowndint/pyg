 //控制层 
app.controller('goodsController' ,function($scope,$http,$controller,goodsService,itemCatService,typeTemplateService){
	
	$controller('baseController',{$scope:$scope});//继承
	
    //读取列表数据绑定到表单中  
	$scope.findAll=function(){
		goodsService.findAll().success(
			function(response){
				$scope.list=response;
			}			
		);
	}    

	//分页
	$scope.findPage=function(page,rows){
		goodsService.findPage(page,rows).success(
			function(response){
				$scope.list=response.rows;
				$scope.paginationConf.totalItems=response.total;//更新总记录数
			}
		);
	}
	
	//查询实体 
	$scope.findOne=function(id){				
		goodsService.findOne(id).success(
			function(response){
				$scope.entity= response;					
			}
		);				
	}

    //$scope.entity={goods:{}, goodsDesc:{itemImages:[]}};
	$scope.img_entity={url:'',color:''};
	//上传图片
	$scope.upload=function () {
		var formData = new FormData();
        formData.append("file", file.files[0]);
		$http({
					method:'POST',
					url:'../goods/upload.do',
			        data:formData,
					headers:{'Content-Type': undefined},
					//transformRequest来转换请求数据的格式
            		transformRequest: angular.identity

		     }).success(function (response) {
			    	console.log(response.message);
                    $scope.img_entity.url=response.message;

        		}).error(function () {
					alert("上传发生错误");
                });
    }

    $scope.addImgEntityToGoods=function () {

        $scope.entity.goodsDesc.itemImages.push($scope.img_entity);
    }

    $scope.removeImgEntityFromGoods=function (index) {

        $scope.entity.goodsDesc.itemImages.splice(index, 1);
    }

	//保存
	$scope.save=function(){

		$scope.entity.goodsDesc.introduction=editor.html();
		var serviceObject;//服务层对象  				
		if($scope.entity.id!=null){//如果有ID
			serviceObject=goodsService.update( $scope.entity ); //修改  
		}else{
			serviceObject=goodsService.add( $scope.entity  );//增加 
		}
		console.log($scope.entity);

		serviceObject.success(
			function(response){
				if(response.success){
					//重新查询 
		        	//$scope.reloadList();//重新加载
					alert("保存成功");
                    editor.html('');
                    $scope.entity={};
				}else{
					alert(response.message);
				}
			}		
		);				
	}

	//获取一级分类数据
	$scope.findCatList1=function() {

		itemCatService.findByParent(0).success(function (response) {
            $scope.catList1=response;
        });
    }

    //点选择一级分类的时候记录选中的分类id,根据category1Id查询二级分类
	$scope.$watch('entity.goods.category1Id', function(newValue) {

        itemCatService.findByParent(newValue).success(function (response) {
            $scope.catList2=response;
        });
    })

	$scope.$watch('entity.goods.category2Id', function(newValue) {

        itemCatService.findByParent(newValue).success(function (response) {
            $scope.catList3=response;
        });
    });

	//三级分类是为了拿到选择的三级分类的的typeId
	$scope.selectedCategory3={};
	$scope.$watch('selectedCategory3', function() {
        $scope.entity.goods.category3Id=$scope.selectedCategory3.id;
        $scope.entity.goods.typeTemplateId=$scope.selectedCategory3.typeId;
        console.log($scope.selectedCategory3);
        //console.log(item);
        //$scope.entity.goods.category3Id=item.id;
        //$scope.entity.goods.typeTemplateId=item.typeId;
    });
	//选中三级分类之后记录typeId赋值给$scope.entity.goods.typeTemplateId
	/*$scope.$watch('entity.goods.category3Id', function(newValue) {

		//用三级分类的id去查询三级分类数据获取typeId
        itemCatService.findOne(newValue).success(function (response) {
			$scope.entity.goods.typeTemplateId=response.typeId;
        });
    });*/

	//关键：根据typeTemplateId获取typeTemplate信息
	$scope.$watch("entity.goods.typeTemplateId", function (newValue) {

        typeTemplateService.findOne(newValue).success(function (response) {

            console.log(response);
        	$scope.typeTemplate=response;
			//封装品牌, 用户选择某个品牌之后封装entity.goods.brandId
			$scope.brandIds=JSON.parse(response.brandIds);
			//扩展属性, 直接封装到goodsDesc ,用户填写customAttributeItem.value封装到customAttributeItems集合存放
			$scope.entity.goodsDesc.customAttributeItems=JSON.parse(response.customAttributeItems);

			//模板的规格数据[{"id":38,"text":"型号"},options":[{"id":118,"optionName":16G","orders":1,"specId":38}]，
			$scope.specIds = JSON.parse(response.specIds);
			console.log(response.specIds);
        });
    })

	$scope.entity={goods:{},goodsDesc:{itemImages:[],specificationItems:[]},itemList:[{spec:{},num:99999,price:99999,status:1,isDefault:1}]};

	//点击规格记录当前点击的规格
	$scope.updateSpecItems=function($event,text, option) {
		//搜索当前点击的checkbox是否在已经选中的集合里面
		var checkedSpecItem = $scope.findCheckedSpecificationItem(text);
		//如果不在集合里面，构造新的specificationItem对象加入到集合
		if(checkedSpecItem==null) {
            $scope.entity.goodsDesc.specificationItems.push({attributeName:text, attributeValue:[option]});
		}else {
			//集合不为空，需要追加选项到已经选中的specificationItem
			//{attributeName:text, attributeValue:[option]}
			if($event.target.checked) {
                checkedSpecItem.attributeValue.push(option);
			} else {
				//处理取消勾选
				//找到点击的option在集合的位置
                var checkedOptionIndex = checkedSpecItem.attributeValue.indexOf(option);
                checkedSpecItem.attributeValue.splice(checkedOptionIndex, 1);
                //如果取消勾选后attributeValue集合为空了，就把当前的specificationItem也移除
				if(checkedSpecItem.attributeValue.length==0) {
					//找到checkedSpecItem在specificationItems集合的位置
                    var specItemIndex = $scope.entity.goodsDesc.specificationItems.indexOf(checkedSpecItem);
                    $scope.entity.goodsDesc.specificationItems.splice(specItemIndex, 1);
				}
			}
		}

		//生成sku列表
        $scope.generateSkuListBySpecItems();
    }

    //获取当前点击的specificationItem
    $scope.findCheckedSpecificationItem=function(text) {

		var specItems = $scope.entity.goodsDesc.specificationItems;
		for(var i=0;i<specItems.length;i++) {
			//{attributeName:text, attributeValue:[option]}
			var specItem = specItems[i];
			if(specItem.attributeName==text) {
				return specItem;
			}
		}
		return null;
	}

	//根据规格选项生成sku列表
	$scope.generateSkuListBySpecItems=function() {

        $scope.entity.itemList = [{spec:{},num:99999,price:99999,status:1,isDefault:1}];
		//遍历$scope.entity.goodsDesc.specificationItems=
		// [{"attributeName":"网络","attributeValue":["移动3G","移动4G"]},{"attributeName":"机身内存","attributeValue":["16G"]}];
        var specItems = $scope.entity.goodsDesc.specificationItems;
		for(var i=0;i<specItems.length;i++) {
			//树的每一层对应一个集合
			var newSkuList = [];

			var specItem = specItems[i];
			//获取规格属性及values
			var attrName = specItem.attributeName;
			var attrValues = specItem.attributeValue;
			//遍历sku树最后一层的每一个节点
			for(var j=0;j<$scope.entity.itemList.length;j++) {
				var oldSkuItem = $scope.entity.itemList[j];
				//遍历attrValues集合克隆attrValues生成新的节点设置attrName,attrValues属性
				for(var k=0;k<attrValues.length;k++) {
					var attrValue = attrValues[k];
                    var newSkuItem = JSON.parse(JSON.stringify(oldSkuItem));
                    //设置属性
                    newSkuItem.spec[attrName]=attrValue;
                    //存放到集合
                    newSkuList.push(newSkuItem);
				}
			}
			//树新的一层构建完成，赋值给 $scope.entity.itemList存放
            $scope.entity.itemList = newSkuList;
			//删除newSkuList
			delete newSkuList;
		}
    }















	
	 
	//批量删除 
	$scope.dele=function(){			
		//获取选中的复选框			
		goodsService.dele( $scope.selectIds ).success(
			function(response){
				if(response.success){
					$scope.reloadList();//刷新列表
					$scope.selectIds=[];
				}						
			}		
		);				
	}
	
	$scope.searchEntity={};//定义搜索对象 
	
	//搜索
	$scope.search=function(page,rows){			
		goodsService.search(page,rows,$scope.searchEntity).success(
			function(response){
				$scope.list=response.rows;	
				$scope.paginationConf.totalItems=response.total;//更新总记录数
			}			
		);
	}
    
});	
