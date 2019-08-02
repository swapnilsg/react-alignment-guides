import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Box from './Box';
import { calculateGuidePositions, findBiggestBox, proximityListener } from './utils/helpers';
import styles from './styles.scss';

class AlignmentGuides extends Component {
	constructor(props) {
		super(props);
		this.boundingBox = React.createRef();
		this.state = {
			active: '',
			boundingBox: null,
			biggestBox: '',
			boxes: {},
			dragging: false,
			guides: {},
			guidesActive: false,
			match: {},
			resizing: false
		};
		this.getBoundingBoxElement = this.getBoundingBoxElement.bind(this);
		this.selectBox = this.selectBox.bind(this);
		this.unSelectBox = this.unSelectBox.bind(this);
		this.dragStartHandler = this.dragStartHandler.bind(this);
		this.dragHandler = this.dragHandler.bind(this);
		this.dragEndHandler = this.dragEndHandler.bind(this);
		this.resizeStartHandler = this.resizeStartHandler.bind(this);
		this.resizeHandler = this.resizeHandler.bind(this);
		this.resizeEndHandler = this.resizeEndHandler.bind(this);
	}

	// TODO: Remove duplicated code in componentDidMount() and componentDidUpdate() methods
	componentDidMount() {
		// Set the dimensions of the bounding box and the draggable boxes when the component mounts.
		if (this.boundingBox.current) {
			const boundingBox = this.boundingBox.current.getBoundingClientRect().toJSON();
			const boxes = {};
			const guides = {};

			// Adding the guides for the bounding box to the guides object
			guides.boundingBox = {
				x: calculateGuidePositions(boundingBox, 'x').map(value => value - boundingBox.left),
				y: calculateGuidePositions(boundingBox, 'y').map(value => value - boundingBox.top)
			};

			this.props.boxes.forEach((dimensions, index) => {
				boxes[`box${index}`] = dimensions;
				guides[`box${index}`] = {
					x: calculateGuidePositions(dimensions, 'x'),
					y: calculateGuidePositions(dimensions, 'y')
				};
			});

			document.addEventListener('click', this.unSelectBox);

			this.setState({
				boundingBox,
				boxes,
				guides,
				biggestBox: findBiggestBox(boxes)
			});
		}
	}

	componentWillUpdate(nextProps, nextState, nextContext) {
		// Set the dimensions of the bounding box and the draggable boxes when the component mounts.
		if (nextProps.boxes !== this.props.boxes) {
			const boundingBox = this.boundingBox.current.getBoundingClientRect().toJSON();
			const boxes = {};
			const guides = {};

			// Adding the guides for the bounding box to the guides object
			guides.boundingBox = {
				x: calculateGuidePositions(boundingBox, 'x').map(value => value - boundingBox.left),
				y: calculateGuidePositions(boundingBox, 'y').map(value => value - boundingBox.top)
			};

			nextProps.boxes.forEach((dimensions, index) => {
				boxes[`box${index}`] = dimensions;
				guides[`box${index}`] = {
					x: calculateGuidePositions(dimensions, 'x'),
					y: calculateGuidePositions(dimensions, 'y')
				};
			});

			this.setState({
				boundingBox,
				boxes,
				guides,
				biggestBox: findBiggestBox(boxes)
			});
		}
	}

	componentWillUnmount() {
		document.removeEventListener('click', this.unSelectBox);
	}

	getBoundingBoxElement() {
		return this.boundingBox;
	}

	selectBox(e) {
		if (e.target.id.indexOf('box') >= 0) {
			const boxDimensions = e.target.getBoundingClientRect().toJSON();
			const data = { x: boxDimensions.x, y: boxDimensions.y, width: boxDimensions.width, height: boxDimensions.height, node: e.target };
			this.setState({
				active: e.target.id
			});
			this.props.onSelect && this.props.onSelect(e, data);
		} else if (e.target.parentNode.id.indexOf('box') >= 0) {
			const boxDimensions = e.target.parentNode.getBoundingClientRect().toJSON();
			const data = { x: boxDimensions.x, y: boxDimensions.y, width: boxDimensions.width, height: boxDimensions.height, node: e.target.parentNode };
			this.setState({
				active: e.target.parentNode.id
			});
			this.props.onSelect && this.props.onSelect(e, data);
		}
	}

	unSelectBox(e) {
		if (e.target.id.indexOf('box') === -1 && e.target.parentNode.id.indexOf('box') === -1) {
			this.setState({
				active: ''
			});
		}
	}

	dragStartHandler(e, data) {
		this.setState({
			active: data.node.id,
			dragging: true
		});
		this.props.onDragStart && this.props.onDragStart(e, data);
	}

	dragHandler(e, data) {
		if (this.state.dragging) {
			this.props.onDrag && this.props.onDrag(e, data);
		}

		const boxes = Object.assign({}, this.state.boxes, {
			[data.node.id]: Object.assign({}, this.state.boxes[data.node.id], {
				x: data.x,
				y: data.y,
				left: data.left,
				top: data.top,
				width: data.width,
				height: data.height
			})
		});
		const guides = Object.assign({}, this.state.guides, {
			[data.node.id]: Object.assign({}, this.state.guides[data.node.id], {
				x: calculateGuidePositions(boxes[data.node.id], 'x'),
				y: calculateGuidePositions(boxes[data.node.id], 'y')
			})
		});

		this.setState({
			guidesActive: true,
			boxes,
			guides
		}, () => {
			const match = proximityListener(this.state.active, this.state.guides);
			let newActiveBoxLeft = this.state.boxes[this.state.active].left;
			let newActiveBoxTop = this.state.boxes[this.state.active].top;
			for (let axis in match) {
				const { activeBoxGuides, matchedArray, proximity } = match[axis];
				const activeBoxProximityIndex = proximity.activeBoxIndex;
				const matchedBoxProximityIndex = proximity.matchedBoxIndex;

				if (axis === 'x') {
					if (activeBoxGuides[activeBoxProximityIndex] > matchedArray[matchedBoxProximityIndex]) {
						newActiveBoxLeft = this.state.boxes[this.state.active].left - proximity.value;
					} else {
						newActiveBoxLeft = this.state.boxes[this.state.active].left + proximity.value;
					}
				} else {
					if (activeBoxGuides[activeBoxProximityIndex] > matchedArray[matchedBoxProximityIndex]) {
						newActiveBoxTop = this.state.boxes[this.state.active].top - proximity.value;
					} else {
						newActiveBoxTop = this.state.boxes[this.state.active].top + proximity.value;
					}
				}
			}
			const boxes = Object.assign({}, this.state.boxes, {
				[this.state.active]: Object.assign({}, this.state.boxes[this.state.active], {
					left: newActiveBoxLeft,
					top: newActiveBoxTop
				})
			});
			const guides = Object.assign({}, this.state.guides, {
				[this.state.active]: Object.assign({}, this.state.guides[this.state.active], {
					x: calculateGuidePositions(boxes[this.state.active], 'x'),
					y: calculateGuidePositions(boxes[this.state.active], 'y')
				})
			})
			this.setState({
				boxes,
				guides,
				match
			});
		});
	}

	dragEndHandler(e, data) {
		this.setState({
			dragging: false,
			guidesActive: false
		});
		this.props.onDragEnd && this.props.onDragEnd(e, data);
	}

	resizeStartHandler(e, data) {
		this.setState({
			active: data.node.id,
			resizing: true
		});
		this.props.onResizeStart && this.props.onResizeStart(e, data);
	}

	resizeHandler(e, data) {
		if (this.state.resizing) {
			this.props.onResize && this.props.onResize(e, data);
		}

		const boxes = Object.assign({}, this.state.boxes, {
			[data.node.id]: Object.assign({}, this.state.boxes[data.node.id], {
				x: data.x,
				y: data.y,
				left: data.left,
				top: data.top,
				width: data.width,
				height: data.height
			})
		});
		const guides = Object.assign({}, this.state.guides, {
			[data.node.id]: Object.assign({}, this.state.guides[data.node.id], {
				x: calculateGuidePositions(boxes[data.node.id], 'x'),
				y: calculateGuidePositions(boxes[data.node.id], 'y')
			})
		});

		this.setState({
			boxes,
			guides
		});
	}

	resizeEndHandler(e, data) {
		this.setState({
			resizing: false,
			guidesActive: false
		});
		this.props.onResizeEnd && this.props.onResizeEnd(e, data);
	}

	render() {
		const { active, boxes, guides } = this.state;

		// Create the draggable boxes from the position data
		const draggableBoxes = Object.keys(boxes).map((box, index) => {
			const position = boxes[box];
			const id = `box${index}`;

			return <Box
				{...this.props}
				biggestBox={this.state.biggestBox}
				boundingBox={this.state.boundingBox}
				dragging={this.state.dragging}
				getBoundingBoxElement={this.getBoundingBoxElement}
				id={id}
				isSelected={active === id}
				key={id}
				onDragStart={this.dragStartHandler}
				onDrag={this.dragHandler}
				onDragEnd={this.dragEndHandler}
				onResizeStart={this.resizeStartHandler}
				onResize={this.resizeHandler}
				onResizeEnd={this.resizeEndHandler}
				position={position}
				resizing={this.state.resizing}
				selectBox={this.selectBox}
			/>;
		});

		// Create a guide(s) when the following conditions are met:
		// 1. A box aligns with another (top, center or bottom)
		// 2. An edge of a box touches any of the edges of another box
		// 3. A box aligns vertically or horizontally with the bounding box
		// TODO: Use a functional component to generate the guides for both axis instead of duplicating code.
		const xAxisGuides = Object.keys(guides).reduce((result, box) => {
			const guideClassNames = this.state.guidesActive ? `${styles.guide} ${styles.xAxis} ${styles.active}` : `${styles.guide} ${styles.xAxis}`;
			const xAxisGuidesForCurrentBox = guides[box].x.map((position, index) => {
				if (
					this.state.active &&
					this.state.active === box &&
					this.state.match &&
					this.state.match.x &&
					this.state.match.x.intersection &&
					this.state.match.x.intersection === position
				) {
					return <div key={`${position}-${index}`} className={guideClassNames} style={{ left: position }} />;
				} else {
					return null;
				}
			});

			return result.concat(xAxisGuidesForCurrentBox);
		}, []);

		const yAxisGuides = Object.keys(guides).reduce((result, box) => {
			const guideClassNames = this.state.guidesActive ? `${styles.guide} ${styles.yAxis} ${styles.active}` : `${styles.guide} ${styles.yAxis}`;
			const yAxisGuidesForCurrentBox = guides[box].y.map((position, index) => {
				if (
					this.state.active &&
					this.state.active === box &&
					this.state.match &&
					this.state.match.y &&
					this.state.match.y.intersection &&
					this.state.match.y.intersection === position
				) {
					return <div key={`${position}-${index}`} className={guideClassNames} style={{ top: position }} />
				} else {
					return null;
				}
			});

			return result.concat(yAxisGuidesForCurrentBox);
		}, []);

		return <div ref={this.boundingBox} className={`${styles.boundingBox} ${this.props.className}`} style={this.props.style}>
			{draggableBoxes}
			{xAxisGuides}
			{yAxisGuides}
		</div>;
	}
}

AlignmentGuides.propTypes = {
	boxes: PropTypes.array.isRequired,
	boxStyle: PropTypes.object,
	className: PropTypes.string,
	drag: PropTypes.bool,
	keybindings: PropTypes.bool,
	onDragStart: PropTypes.func,
	onDrag: PropTypes.func,
	onDragEnd: PropTypes.func,
	onResizeStart: PropTypes.func,
	onResize: PropTypes.func,
	onResizeEnd: PropTypes.func,
	onRotateStart: PropTypes.func,
	onRotate: PropTypes.func,
	onRotateEnd: PropTypes.func,
	onSelect: PropTypes.func,
	resize: PropTypes.bool,
	rotate: PropTypes.bool,
	style: PropTypes.object
};

export default AlignmentGuides;