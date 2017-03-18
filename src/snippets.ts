export const REACT_PURE_COMPONENT = `import Component from 'src/components/Component'

// import './styles/$moduleName.scss'

export default class $moduleName extends Component {
  static propTypes = {}
  static defaultProps = {}
  static pure = true

  render() {
    return (
      <div className='$rootClassName'>
        \${1:$moduleName}
      </div>
    )
  }
}
`

export const REACT_LIST_COMPONENT = `import ListComponent from 'src/components/ListComponent'

// import './styles/$moduleName.scss'

export default class $moduleName extends ListComponent {
  static propTypes = {}
  static defaultProps = {}
  static pure = true

  render() {
    return (
      <div className='$rootClassName'>
        \${1:$moduleName}
      </div>
    )
  }
}
`

export const REACT_COMPONENT_STYLE = `.$rootClassName {
  \${1}
}`
