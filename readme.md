# elmer-virtual-dom

### 简介
    解析html代码转换成json数据,对虚拟dom数据进行增加节点，删除节点，复制节点等操作
    virtualElementsDiff对两个virtualElement做diff运算，对比差异
----
### 单元测试配置
- 需要支持typescript语法，在tsconfig.json文件中将测试脚本所在目录添加到include配置
### 模板解析语法
- 属性前缀em: ，指定当前属性需要调用变量， em:属性读取的值为Function时保留Function
- 属性前缀et: , 指定当前属性为事件绑定属性， 原生dom绑定事件不需要加on,示例增加单击事件： et:click="onClickEvent"
- 属性：em:for, 列表循环, 语法实例: let item in this.exampleData,  item为下层dom元素绑定数据变量名, this.exampleData为获取循环列表数据
- forEach标签，新增标签用于列表循环, 属性data为列表循环源数据(不需要设置绑定属性), item指定调用循环项数据变量名称,index指定循环索引
   > 列表循环渲染子级必须设置key,这是为了降低diff运算复杂度
   > ``` html
   >    <forEach data="testData" item="item" index="myIndex">
   >        <div key="test"><span>{{item.title}}-{{myIndex}}</span></div>
   >    </forEach>
   > ```
- em:for属性列表渲染，当前属性为兼容旧代码而保留，不建议使用
   > 使用语法： em:for="let item in this.listData", this.listData指向列表循环数据，item为循环内部元素调用数据变量
- 属性：em:前缀，除em:for以外，表示值是从组件获取或者值是判断类型，
   > 1. 条件判断语法： eq(==), neq(!=),seq(===), sneq(!==),lt(<),gt(>),lteq(<=),gteq(>=)
   > 2. 判断前后变量等用空格分隔开
   > 3. 示例： em:show="this.listData.length seq 5", 解析代码为： em:show="this.listData.length === 5"
   > 4. Lamada语法： em:show="testValue eq 3 ? 'true' : 'false'"
 - 绑定文本语法
   > 1. 普通文本绑定：{{state.title}}
   > 2. 获取不到值设置默认值： {{state.title || 'default'}},当state.title的值为undefeined或者null时，当前绑定内容"default"
   > 3. 绑定方法，渲染绑定方法返回的结果： {{this.exampleAction('A',2)}}
   > ``` html
   >     <div>
   >        <span>{{state.title}}</span>
   >        <span>{{state.title || 'default'}}</span>
   >        <span>{{this.exampleAction('A',2)}}</span> <!--通过调用方法返回值绑定内容-->
   >     </div>
   > ```
   > 4. Lambda表达式绑定, {{demo.level % 2 eq 0 ? 'true' : 'false'}}, 不支持嵌套使用
- 事件绑定