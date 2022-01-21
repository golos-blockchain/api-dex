import React from 'react'
import ReactMarkdown from 'react-markdown'
import fs from 'fs'
import 'github-markdown-css/github-markdown.css'

function linkRenderer(props) {
	return <a href={props.href} target='_blank' rel='noreferrer noopener'>{props.children}</a>
}

export async function getStaticProps(context) {
	const path = process.cwd() + '/README.md'
	const data = fs.readFileSync(path, 'utf8')
	return {
		props: {
			data
		}
	}
}

class Index extends React.Component {
	render() {
		return <div className='markdown-body'>
			<ReactMarkdown components={{ 'a': linkRenderer }}>{this.props.data}</ReactMarkdown>
			</div>
	}
}

export default Index
