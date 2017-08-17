export const REACT_PURE_PAGE_COMPONENT = `import * as React from 'react'
import { RouteComponentProps } from 'react-router'
import Page from 'mora-common/widget/Page'

// import './styles/$moduleName.scss'

export default class $moduleName extends React.PureComponent<RouteComponentProps<any>, any> {
  render() {
    return (
      <Page name='$moduleName'>
        \${1:$moduleName}
      </Page>
    )
  }
}
`

export const REACT_PURE_ADMIN_PAGE_COMPONENT = `import * as React from 'react'
import {IFrameRouteProps} from 'pages/admin/base/interface'
import Page from 'mora-common/widget/Page'

// import './styles/$moduleName.scss'

export default class $moduleName extends React.PureComponent<IFrameRouteProps<any>, any> {
  componentWillMount() {
    this.props.setBreadcrumb([
      {title: '标题'}
    ])
  }

  render() {
    return (
      <Page name='$moduleName'>
        \${1:$moduleName}
      </Page>
    )
  }
}
`

export const REACT_PURE_COMPONENT = `import * as React from 'react'

// import './styles/$moduleName.scss'

export default class $moduleName extends React.PureComponent<any, any> {
  static defaultProps = {}

  render() {
    return (
      <div className='$rootClassName'>
        \${1:$moduleName}
      </div>
    )
  }
}
`

export const REACT_LIST_PAGE_COMPONENT = `import ListComponent from 'libs/components/ListComponent'

// import './styles/$moduleName.scss'

export default class $moduleName extends ListComponent {

  render() {
    return (
      <div className='$rootClassName'>
        \${1:$moduleName}
      </div>
    )
  }
}
`

export const REACT_LIST_COMPONENT = `import ListComponent from 'libs/components/ListComponent'

// import './styles/$moduleName.scss'

export default class $moduleName extends ListComponent {
  static propTypes = {}
  static defaultProps = {}

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
