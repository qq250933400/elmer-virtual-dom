# elmer-virtual-dom

### 简介
    解析html代码转换成json数据,对虚拟dom数据进行增加节点，删除节点，复制节点等操作
    virtualElementsDiff对两个virtualElement做diff运算，对比差异

### 模板解析语法
    - 属性前缀em: ，指定当前属性需要调用变量， em:属性读取的值为Function时保留Function
    - 属性前缀et: , 指定当前属性为事件绑定属性， 原生dom绑定事件不需要加on,示例增加单击事件： et:click="onClickEvent"
    - 属性：em:for, 列表循环, 语法实例: let item in this.exampleData,  item为下层dom元素绑定数据变量名, this.exampleData为获取循环列表数据
    - forEach标签，新增标签用于列表循环, 属性data为列表循环源数据, item指定调用循环项数据变量名称,index指定循环索引